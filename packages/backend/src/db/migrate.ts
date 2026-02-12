import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";

const sqlite = new Database("network-admin.db");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite);

// Scenarios table (must be created before tables that reference it)
db.run(sql`
  CREATE TABLE IF NOT EXISTS scenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// Create all tables
db.run(sql`
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

db.run(sql`
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

db.run(sql`
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

db.run(sql`
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

db.run(sql`
  CREATE TABLE IF NOT EXISTS access_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
    is_active INTEGER DEFAULT 1
  )
`);

db.run(sql`
  CREATE TABLE IF NOT EXISTS schedule_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id INTEGER NOT NULL REFERENCES access_profiles(id) ON DELETE CASCADE,
    day_type TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL
  )
`);

db.run(sql`
  CREATE TABLE IF NOT EXISTS connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_switch_id INTEGER NOT NULL REFERENCES switches(id) ON DELETE CASCADE,
    from_port INTEGER NOT NULL,
    to_switch_id INTEGER NOT NULL REFERENCES switches(id) ON DELETE CASCADE,
    to_port INTEGER NOT NULL,
    link_type TEXT DEFAULT 'trunk'
  )
`);

// Safe migrations for existing databases: add scenario_id columns if missing
const switchCols = (sqlite.prepare("PRAGMA table_info(switches)").all() as any[]).map((c: any) => c.name);
if (!switchCols.includes("scenario_id")) {
  sqlite.exec("ALTER TABLE switches ADD COLUMN scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE");
  console.log("Added scenario_id to switches.");
}

const vlanCols = (sqlite.prepare("PRAGMA table_info(vlans)").all() as any[]).map((c: any) => c.name);
if (!vlanCols.includes("scenario_id")) {
  sqlite.exec("ALTER TABLE vlans ADD COLUMN scenario_id INTEGER REFERENCES scenarios(id) ON DELETE CASCADE");
  console.log("Added scenario_id to vlans.");
}

console.log("Database migrated successfully.");
sqlite.close();
