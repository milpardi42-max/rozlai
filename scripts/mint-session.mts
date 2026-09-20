import { createSessionToken, type SessionUser } from "../src/lib/session";
const user = JSON.parse(process.argv[2]!) as SessionUser;
console.log(await createSessionToken(user));
