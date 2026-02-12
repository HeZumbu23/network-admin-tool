import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.js";

const client = createClient({ url: "file:network-admin.db" });

// Enable WAL mode and foreign keys
await client.execute("PRAGMA journal_mode = WAL");
await client.execute("PRAGMA foreign_keys = ON");

export const db = drizzle(client, { schema });
