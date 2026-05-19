import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL!;
const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  await client.connect();
  console.log("Connected to Render DB");

  // 1. Add matricule column as nullable first
  console.log("\n--- Step 1: Add matricule column (nullable) ---");
  try {
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS matricule varchar(10)`);
    console.log("✓ matricule column added/exists");
  } catch (e: any) {
    console.log("matricule column:", e.message);
  }

  // 2. Fill existing users with unique matricule values
  console.log("\n--- Step 2: Fill empty matricule values ---");
  const { rows: users } = await client.query(`SELECT id, first_name, matricule FROM users WHERE matricule IS NULL`);
  for (let i = 0; i < users.length; i++) {
    const mat = String(1000000000 + i + 1); // Generate unique 10-digit matricules
    await client.query(`UPDATE users SET matricule = $1 WHERE id = $2`, [mat, users[i].id]);
    console.log(`  Set matricule ${mat} for user ${users[i].id} (${users[i].first_name})`);
  }

  // 3. Add NOT NULL constraint
  console.log("\n--- Step 3: Add NOT NULL constraint ---");
  try {
    await client.query(`ALTER TABLE users ALTER COLUMN matricule SET NOT NULL`);
    console.log("✓ matricule set to NOT NULL");
  } catch (e: any) {
    console.log("NOT NULL:", e.message);
  }

  // 4. Add UNIQUE constraint
  console.log("\n--- Step 4: Add UNIQUE constraint ---");
  try {
    await client.query(`ALTER TABLE users ADD CONSTRAINT users_matricule_unique UNIQUE (matricule)`);
    console.log("✓ unique constraint added");
  } catch (e: any) {
    if (e.message.includes("already exists")) console.log("✓ unique constraint already exists");
    else console.log("UNIQUE:", e.message);
  }

  // 5. Add confirmed_completion to missions
  console.log("\n--- Step 5: Add confirmed_completion to missions ---");
  try {
    await client.query(`ALTER TABLE missions ADD COLUMN IF NOT EXISTS confirmed_completion boolean DEFAULT false`);
    console.log("✓ confirmed_completion added");
  } catch (e: any) {
    console.log("confirmed_completion:", e.message);
  }

  // 6. Add gps_tracking vehicle_id unique constraint
  console.log("\n--- Step 6: Add gps_tracking vehicle_id unique ---");
  try {
    // Remove duplicates first (keep latest)
    await client.query(`
      DELETE FROM gps_tracking a USING gps_tracking b 
      WHERE a.id < b.id AND a.vehicle_id = b.vehicle_id
    `);
    await client.query(`ALTER TABLE gps_tracking ADD CONSTRAINT gps_tracking_vehicle_id_unique UNIQUE (vehicle_id)`);
    console.log("✓ gps_tracking vehicle_id unique constraint added");
  } catch (e: any) {
    if (e.message.includes("already exists")) console.log("✓ constraint already exists");
    else console.log("gps_tracking unique:", e.message);
  }

  // 7. Ensure all other missing columns exist
  console.log("\n--- Step 7: Ensure other mission columns ---");
  const missionCols = [
    ["end_lat", "double precision"],
    ["end_lng", "double precision"],
    ["start_lat", "double precision"],
    ["start_lng", "double precision"],
    ["co_pilot", "text"],
    ["passengers_count", "integer DEFAULT 1"],
    ["actual_start", "timestamp"],
    ["actual_end", "timestamp"],
  ];
  for (const [col, type] of missionCols) {
    try {
      await client.query(`ALTER TABLE missions ADD COLUMN IF NOT EXISTS ${col} ${type}`);
      console.log(`  ✓ missions.${col}`);
    } catch (e: any) {
      console.log(`  missions.${col}: ${e.message}`);
    }
  }

  // 8. Ensure user columns
  console.log("\n--- Step 8: Ensure user columns ---");
  const userCols = [
    ["password_hash", "varchar"],
    ["role", "varchar DEFAULT 'chauffeur'"],
  ];
  for (const [col, type] of userCols) {
    try {
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col} ${type}`);
      console.log(`  ✓ users.${col}`);
    } catch (e: any) {
      console.log(`  users.${col}: ${e.message}`);
    }
  }

  console.log("\n✅ Migration complete! Now run drizzle-kit push to finalize.");
  await client.end();
}

migrate().catch(console.error);
