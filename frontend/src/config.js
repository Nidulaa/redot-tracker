// Accounts with admin access to the Admin Report tab (company financial
// overview: income, expenses, and every logged task). This is a UI-level
// gate only, not a security boundary — Supabase RLS grants every signed-in
// account full read/write on all tables (see supabase/schema.sql), same as
// the rest of this internal tool.
export const ADMIN_EMAILS = ['nidulalokuge@gmail.com'];

export function isAdminUser(user) {
  return !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
}
