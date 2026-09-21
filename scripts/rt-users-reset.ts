/** Reset/register the smoke-test artist user. Idempotent. */
import { createUser, findUserByEmail, updateUser } from "../src/lib/data/users";

async function main() {
  const artistEmail = "artist-smoke@rosie.local";
  const existing = await findUserByEmail(artistEmail);
  if (!existing) {
    const u = await createUser("Smoke Artist", artistEmail, "smoke1234", "artist", "artist-niloufar-rad");
    console.log("created", u.id);
  } else {
    await updateUser(existing.id, { role: "artist", artistId: "artist-niloufar-rad" });
    console.log("exists", existing.id);
  }
}
void main();
