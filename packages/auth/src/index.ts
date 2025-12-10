export { getAuthOptions } from "./auth.config";
// For backward compatibility, export a function that returns authOptions
export async function authOptions() {
  return await getAuthOptions();
}
export { getServerSession } from "next-auth";
export type { Session } from "next-auth";

