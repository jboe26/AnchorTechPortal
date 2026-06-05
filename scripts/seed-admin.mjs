import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const email = "joshboepple@anchortech.org";
const password = "AnchorAdmin2026!";
const name = "Josh Boepple";

const { data: existing } = await supabase
  .from("AdminUser")
  .select("id")
  .eq("email", email)
  .single();

if (existing) {
  console.log("Admin user already exists:", email);
  process.exit(0);
}

const hash = await bcrypt.hash(password, 12);
const now = new Date().toISOString();

const { data, error } = await supabase
  .from("AdminUser")
  .insert({ id: randomUUID(), email, name, password: hash, createdAt: now, updatedAt: now })
  .select("id, email, name")
  .single();

if (error) {
  console.error("Failed to create admin:", error.message);
  process.exit(1);
}

console.log("Created admin:", data.email);
