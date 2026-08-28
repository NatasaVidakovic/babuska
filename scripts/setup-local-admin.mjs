import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const email = process.env.SUPABASE_ADMIN_EMAIL;
const password = process.env.SUPABASE_ADMIN_PASSWORD;
if (!url || !secret || !email || !password)
  throw new Error(
    "Missing SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_ADMIN_EMAIL, or SUPABASE_ADMIN_PASSWORD.",
  );

const admin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: WebSocket },
});
const { data: listed, error: listError } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});
if (listError)
  throw new Error(`Could not list local users: ${listError.message}`);
let user = listed.users.find(
  (candidate) => candidate.email?.toLowerCase() === email.toLowerCase(),
);
if (user) {
  const { data, error } = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`Could not update local admin: ${error.message}`);
  user = data.user;
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user)
    throw new Error(
      `Could not create local admin: ${error?.message ?? "no user returned"}`,
    );
  user = data.user;
}
const { error: roleError } = await admin
  .from("admin_users")
  .upsert({ user_id: user.id });
if (roleError)
  throw new Error(`Could not grant admin role: ${roleError.message}`);
console.log(`Local administrator is ready: ${email}`);
