import { Router } from "express";
import { db } from "../db/index.js";
import { switches, switchPorts } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

export const switchesRouter = Router();

// List all switches
switchesRouter.get("/", async (_req, res) => {
  const result = await db.select().from(switches);
  res.json(result);
});

// Get single switch with ports
switchesRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [sw] = await db.select().from(switches).where(eq(switches.id, id));
  if (!sw) return res.status(404).json({ error: "Switch not found" });

  const ports = await db.select().from(switchPorts).where(eq(switchPorts.switchId, id));
  res.json({ ...sw, ports });
});

// Create switch (auto-generates ports)
switchesRouter.post("/", async (req, res) => {
  const { name, model, ipAddress, portCount, isManaged, location } = req.body;
  const [result] = await db
    .insert(switches)
    .values({ name, model, ipAddress, portCount: portCount || 8, isManaged: isManaged || false, location })
    .returning();

  for (let i = 1; i <= (portCount || 8); i++) {
    await db.insert(switchPorts).values({ switchId: result.id, portNumber: i });
  }

  res.status(201).json(result);
});

// Update switch
switchesRouter.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, model, ipAddress, portCount, isManaged, location } = req.body;
  const [result] = await db
    .update(switches)
    .set({ name, model, ipAddress, portCount, isManaged, location })
    .where(eq(switches.id, id))
    .returning();
  if (!result) return res.status(404).json({ error: "Switch not found" });
  res.json(result);
});

// Delete switch
switchesRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(switches).where(eq(switches.id, id));
  res.json({ success: true });
});

// Configure a port's VLAN settings
switchesRouter.put("/:id/ports/:portNum", async (req, res) => {
  const switchId = Number(req.params.id);
  const portNumber = Number(req.params.portNum);
  const { label, vlanMode, pvid, trunkVlans } = req.body;

  const results = await db
    .update(switchPorts)
    .set({ label, vlanMode, pvid, trunkVlans: trunkVlans ? JSON.stringify(trunkVlans) : undefined })
    .where(and(eq(switchPorts.switchId, switchId), eq(switchPorts.portNumber, portNumber)))
    .returning();

  if (results.length === 0) return res.status(404).json({ error: "Port not found" });
  res.json(results[0]);
});
