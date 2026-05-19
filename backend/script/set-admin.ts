import pg from "pg";
import bcrypt from "bcrypt";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
const hash = await bcrypt.hash("ahmedznati", 10);

// First check if there's already a superadmin
const existing = await client.query("SELECT id, first_name, role, matricule FROM users WHERE role = 'superadmin'");

if (existing.rowCount && existing.rowCount > 0) {
  const r = await client.query(
    "UPDATE users SET matricule = $1, password_hash = $2 WHERE role = 'superadmin' RETURNING id, first_name, matricule, role",
    ["1234567890", hash]
  );
  console.log("Updated superadmin:", r.rows);
} else {
  // No superadmin yet — pick the first Ahmed or first user
  const all = await client.query("SELECT id, first_name, role, matricule FROM users ORDER BY created_at ASC");
  console.log("No superadmin found. Users:");
  console.table(all.rows);
  const target = all.rows[0];
  const r = await client.query(
    "UPDATE users SET matricule = $1, password_hash = $2, role = 'superadmin' WHERE id = $3 RETURNING id, first_name, matricule, role",
    ["1234567890", hash, target.id]
  );
  console.log("Set as superadmin:", r.rows);
}

await client.end();
