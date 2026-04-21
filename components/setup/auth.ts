export const ADMIN_USERS = ["oguzhan", "fcdagdelen", "djserveth"];

export function isAdmin(login: string | null | undefined): boolean {
  return typeof login === "string" && ADMIN_USERS.includes(login);
}
