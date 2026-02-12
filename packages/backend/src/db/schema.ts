import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// --- Switches ---

export const switches = sqliteTable("switches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  model: text("model"),
  ipAddress: text("ip_address"),
  portCount: integer("port_count").notNull().default(8),
  isManaged: integer("is_managed", { mode: "boolean" }).default(false),
  location: text("location"),
  posX: real("pos_x").default(0),
  posY: real("pos_y").default(0),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const switchPorts = sqliteTable("switch_ports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  switchId: integer("switch_id")
    .notNull()
    .references(() => switches.id, { onDelete: "cascade" }),
  portNumber: integer("port_number").notNull(),
  label: text("label"),
  vlanMode: text("vlan_mode").default("access"), // 'access' | 'trunk'
  pvid: integer("pvid").default(1),
  trunkVlans: text("trunk_vlans").default("[]"), // JSON array of VLAN IDs
});

// --- VLANs ---

export const vlans = sqliteTable("vlans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vlanId: integer("vlan_id").notNull().unique(),
  name: text("name").notNull(),
  subnet: text("subnet"),
  gateway: text("gateway"),
  dhcpEnabled: integer("dhcp_enabled", { mode: "boolean" }).default(false),
  dhcpRange: text("dhcp_range"),
  description: text("description"),
});

// --- Devices ---

export const devices = sqliteTable("devices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  macAddress: text("mac_address").notNull().unique(),
  ipAddress: text("ip_address"),
  vlanId: integer("vlan_id").references(() => vlans.id, {
    onDelete: "set null",
  }),
  switchId: integer("switch_id").references(() => switches.id, {
    onDelete: "set null",
  }),
  portNumber: integer("port_number"),
  deviceType: text("device_type").default("other"),
  isOnline: integer("is_online", { mode: "boolean" }).default(false),
});

// --- Access Profiles ---

export const accessProfiles = sqliteTable("access_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  deviceId: integer("device_id").references(() => devices.id, {
    onDelete: "cascade",
  }),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
});

export const scheduleRules = sqliteTable("schedule_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id")
    .notNull()
    .references(() => accessProfiles.id, { onDelete: "cascade" }),
  dayType: text("day_type").notNull(), // 'weekday', 'weekend', 'monday', etc.
  startTime: text("start_time").notNull(), // HH:MM
  endTime: text("end_time").notNull(), // HH:MM
});

// --- Topology Connections ---

export const connections = sqliteTable("connections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fromSwitchId: integer("from_switch_id")
    .notNull()
    .references(() => switches.id, { onDelete: "cascade" }),
  fromPort: integer("from_port").notNull(),
  toSwitchId: integer("to_switch_id")
    .notNull()
    .references(() => switches.id, { onDelete: "cascade" }),
  toPort: integer("to_port").notNull(),
  linkType: text("link_type").default("trunk"), // 'trunk' | 'access'
});
