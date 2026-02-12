import { createClient } from "@libsql/client";

const client = createClient({ url: "file:network-admin.db" });

await client.execute("PRAGMA journal_mode = WAL");
await client.execute("PRAGMA foreign_keys = OFF"); // OFF during migration for ALTER TABLE

await client.execute(`
  CREATE TABLE IF NOT EXISTS scenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

await client.execute(`
  CREATE TABLE IF NOT EXISTS switches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    model TEXT,
    ip_address TEXT,
    port_count INTEGER NOT NULL DEFAULT 8,
    is_managed INTEGER DEFAULT 0,
    location TEXT,
    pos_x REAL DEFAULT 0,
    pos_y REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

await client.execute(`
  CREATE TABLE IF NOT EXISTS switch_ports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    switch_id INTEGER NOT NULL REFERENCES switches(id) ON DELETE CASCADE,
    port_number INTEGER NOT NULL,
    label TEXT,
    vlan_mode TEXT DEFAULT 'access',
    pvid INTEGER DEFAULT 1,
    trunk_vlans TEXT DEFAULT '[]'
  )
`);

await client.execute(`
  CREATE TABLE IF NOT EXISTS vlans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE,
    vlan_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    subnet TEXT,
    gateway TEXT,
    dhcp_enabled INTEGER DEFAULT 0,
    dhcp_range TEXT,
    description TEXT
  )
`);

await client.execute(`
  CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    mac_address TEXT NOT NULL UNIQUE,
    ip_address TEXT,
    vlan_id INTEGER REFERENCES vlans(id) ON DELETE SET NULL,
    switch_id INTEGER REFERENCES switches(id) ON DELETE SET NULL,
    port_number INTEGER,
    device_type TEXT DEFAULT 'other',
    is_online INTEGER DEFAULT 0
  )
`);

await client.execute(`
  CREATE TABLE IF NOT EXISTS access_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
    is_active INTEGER DEFAULT 1
  )
`);

await client.execute(`
  CREATE TABLE IF NOT EXISTS schedule_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER NOT NULL REFERENCES access_profiles(id) ON DELETE CASCADE,
    day_type TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL
  )
`);

await client.execute(`
  CREATE TABLE IF NOT EXISTS connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_switch_id INTEGER NOT NULL REFERENCES switches(id) ON DELETE CASCADE,
    from_port INTEGER NOT NULL,
    to_switch_id INTEGER NOT NULL REFERENCES switches(id) ON DELETE CASCADE,
    to_port INTEGER NOT NULL,
    link_type TEXT DEFAULT 'trunk'
  )
`);

// Safe migrations: add scenario_id columns if missing (column index 1 = name)
const switchInfo = await client.execute("PRAGMA table_info(switches)");
const switchCols = switchInfo.rows.map((r) => r[1] as string);
if (!switchCols.includes("scenario_id")) {
  await client.execute(
    "ALTER TABLE switches ADD COLUMN scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE"
  );
  console.log("Added scenario_id to switches.");
}

const vlanInfo = await client.execute("PRAGMA table_info(vlans)");
const vlanCols = vlanInfo.rows.map((r) => r[1] as string);
if (!vlanCols.includes("scenario_id")) {
  await client.execute(
    "ALTER TABLE vlans ADD COLUMN scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE"
  );
  console.log("Added scenario_id to vlans.");
}

await client.execute("PRAGMA foreign_keys = ON");
console.log("Database migrated successfully.");
client.close();
