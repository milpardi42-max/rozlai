import "server-only";
import crypto from "crypto";
import { s3Config, sha256Hex, hmac, uriEncode, presignS3Url } from "@/lib/files/storage";

/**
 * Phase 4 — multipart upload for master files larger than the request-body
 * limit. The browser PUTs each part directly to S3/R2 with presigned URLs
 * (init returns one URL per part), then asks us to complete the upload.
 * No AWS SDK — this is SigV4 over HTTPS, same style as storage.ts.
 *
 * Constraints (S3 spec): up to 10,000 parts, each 5 MiB–5 GiB except the last.
 */

export const MULTIPART_PART_BYTES = 16 * 1024 * 1024; // 16 MiB chunks
const MAX_PARTS_PER_RESPONSE = 200;

export interface MultipartSession {
  key: string;
  uploadId: string;
  partBytes: number;
  partCount: number;
  /** presigned PUT url per part, pages of MAX_PARTS_PER_RESPONSE at a time */
  urls: string[];
  urlPage: number;
  totalPages: number;
}

function amzNow(): { amzDate: string; dateStamp: string } {
  const amzDate = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return { amzDate, dateStamp: amzDate.slice(0, 8) };
}

/** Direct signed S3 API call (CreateMultipartUpload / Complete / Abort). */
async function s3Api(
  method: "POST" | "DELETE",
  key: string,
  query: Record<string, string>,
  body: Buffer | null,
): Promise<{ text: string; status: number }> {
  const cfg = s3Config();
  if (!cfg) throw new Error("s3_not_configured");
  const host = `${cfg.bucket}.${new URL(cfg.endpoint).host}`;
  const { amzDate, dateStamp } = amzNow();
  const scope = `${dateStamp}/${cfg.region}/s3/aws4_request`;
  const payloadHash = sha256Hex(body ?? Buffer.alloc(0));

  const canonicalQuery = Object.keys(query)
    .sort()
    .map((k) => `${uriEncode(k)}=${uriEncode(query[k]!)}`)
    .join("&");
  const headers: Record<string, string> = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((k) => `${k}:${headers[k]}`)
    .join("\n");
  const canonicalRequest = [method, uriEncode(`/${key}`), canonicalQuery, `${canonicalHeaders}\n`, signedHeaders, payloadHash].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(canonicalRequest)].join("\n");

  let k: Buffer | string = `AWS4${cfg.secretKey}`;
  k = hmac(k, dateStamp);
  k = hmac(k, cfg.region);
  k = hmac(k, "s3");
  k = hmac(k, "aws4_request");
  const signature = crypto.createHmac("sha256", k).update(stringToSign, "utf8").digest("hex");
  headers.authorization = `AWS4-HMAC-SHA256 Credential=${cfg.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`https://${host}${uriEncode(`/${key}`)}?${canonicalQuery}`, {
    method,
    headers,
    body: body ? new Uint8Array(body) : null,
    cache: "no-store",
  });
  return { text: await res.text(), status: res.status };
}

/** Step 1 — slice a file of `size` bytes into multipart parts and get an uploadId + presigned PUT URLs. */
export async function beginMultipart(
  ext: string,
  size: number,
  page = 0,
): Promise<MultipartSession | { error: string }> {
  if (!s3Config()) return { error: "s3_not_configured" };
  if (size <= 0) return { error: "empty_file" };

  const partCount = Math.ceil(size / MULTIPART_PART_BYTES);
  if (partCount > 10_000) return { error: "file_too_large_for_multipart" };
  const totalPages = Math.ceil(partCount / MAX_PARTS_PER_RESPONSE);
  if (page < 0 || page >= totalPages) return { error: "invalid_page" };

  const key = `files/multi/${crypto.randomUUID()}.${ext}`;
  let uploadId: string;
  let created = { text: "", status: 0 };

  try {
    // Page > 0 requires an existing uploadId — passed back in by the route; here page 0 always creates.
    created = await s3Api("POST", key, { uploads: "" }, null);
    if (created.status < 200 || created.status >= 300) {
      return { error: `s3_create_multipart_${created.status}` };
    }
    const m = /<UploadId>([^<]+)<\/UploadId>/.exec(created.text);
    if (!m) return { error: "s3_create_multipart_parse" };
    uploadId = m[1]!;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "s3_unreachable" };
  }

  return continueMultipart(key, uploadId, size, page);
}

/** Step 1b — hand out the next page of presigned part URLs for an existing uploadId. */
export async function continueMultipart(
  key: string,
  uploadId: string,
  size: number,
  page: number,
): Promise<MultipartSession | { error: string }> {
  const partCount = Math.ceil(size / MULTIPART_PART_BYTES);
  const totalPages = Math.ceil(partCount / MAX_PARTS_PER_RESPONSE);
  if (page < 0 || page >= totalPages) return { error: "invalid_page" };

  const from = page * MAX_PARTS_PER_RESPONSE + 1;
  const to = Math.min(partCount, from + MAX_PARTS_PER_RESPONSE - 1);
  const urls: string[] = [];
  for (let partNumber = from; partNumber <= to; partNumber++) {
    const url = presignS3Url("PUT", key, 15 * 60, { partNumber: String(partNumber), uploadId });
    if (!url) return { error: "s3_presign_failed" };
    urls.push(url);
  }
  return { key, uploadId, partBytes: MULTIPART_PART_BYTES, partCount, urls, urlPage: page, totalPages };
}

/** Step 2 — complete: assemble the parts list the client collected from S3 ETags. */
export async function completeMultipart(
  key: string,
  uploadId: string,
  parts: { partNumber: number; etag: string }[],
): Promise<{ ok: true; location?: string } | { error: string }> {
  if (!s3Config()) return { error: "s3_not_configured" };
  if (!parts.length) return { error: "no_parts" };
  const sorted = [...parts].sort((a, b) => a.partNumber - b.partNumber);
  if (sorted.some((p, i) => p.partNumber !== i + 1)) return { error: "parts_not_sequential" };

  const xmlParts = sorted
    .map(
      (p) =>
        `<Part><PartNumber>${p.partNumber}</PartNumber><ETag>${p.etag.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")}</ETag></Part>`,
    )
    .join("");
  const body = Buffer.from(`<CompleteMultipartUpload xmlns="http://s3.amazonaws.com/doc/2006-03-01/">${xmlParts}</CompleteMultipartUpload>`, "utf8");

  try {
    const res = await s3Api("POST", key, { uploadId }, body);
    if (res.status < 200 || res.status >= 300) return { error: `s3_complete_${res.status}` };
    const location = /<Location>([^<]+)<\/Location>/.exec(res.text)?.[1];
    return { ok: true, location };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "s3_unreachable" };
  }
}

/** Cancel an unfinished upload so parts don't leak into the bucket. */
export async function abortMultipart(key: string, uploadId: string): Promise<boolean> {
  try {
    const res = await s3Api("DELETE", key, { uploadId }, null);
    return res.status >= 200 && res.status < 300;
  } catch {
    return false;
  }
}
