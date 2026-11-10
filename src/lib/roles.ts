export const SUPERADMIN_EMAIL = "zananrobin@gmail.com";

export function isSuperadminEmail(email?: string | null): boolean {
  return !!email && email.trim().toLowerCase() === SUPERADMIN_EMAIL;
}

export function isVerifiedSuperadmin(user: {
  email?: string | null;
  email_confirmed_at?: string | null;
} | null | undefined): boolean {
  return !!user?.email_confirmed_at && isSuperadminEmail(user.email);
}
