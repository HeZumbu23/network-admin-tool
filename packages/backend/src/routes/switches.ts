import { Router } from "express";
import { db } from "../db/index.js";
import { switches, switchPorts } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const switchesRouter = Router();

// List all switches
switchesRouter.get("/", (_req, res) => {
  const result = db.select().from(switches).all();
  res.json(result);
});

// Get single switch with ports
switchesRouter.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  const sw = db.select().from(switches).where(eq(switches.id, id)).get();
  if (!sw) return res.status(404).json({ error: "Switch not found" });

  const ports = db
    .select()
    .from(switchPorts)
    .where(eq(switchPorts.switchId, id))
    .all();
  res.json({ ...sw, ports });
});

// Create switch (auto-generates ports)
switchesRouter.post("/", (req, res) => {
  const { name, model, ipAddress, portCount, isManaged, location } = req.body;
  const result = db
    .insert(switches)
    .values({
      name,
      model,
      ipAddress,
      portCount: portCount || 8,
      isManaged: isManaged || false,
      location,
    })
    .returning()
    .get();

  // Auto-create port entries
  for (let i = 1; i <= (portCount || 8); i++) {
    db.insert(switchPorts)
      .values({ switchId: result.id, portNumber: i })
      .run();
  }

  res.status(201).json(result);
});

// Update switch
switchesRouter.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  const { name, model, ipAddress, portCount, isManaged, location } = req.body;
  const result = db
    .update(switches)
    .set({ name, model, ipAddress, portCount, isManaged, location })
    .where(eq(switches.id, id))
    .returning()
    .get();
  if (!result) return res.status(404).json({ error: "Switch not found" });
  res.json(result);
});

// Delete switch
switchesRouter.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  db.delete(switches).where(eq(switches.id, id)).run();
  res.json({ success: true });
});

// Configure a port's VLAN settings
switchesRouter.put("/:id/ports/:portNum", (req, res) => {
  const switchId = Number(req.params.id);
  const portNumber = Number(req.params.portNum);
  const { label, vlanMode, pvid, trunkVlans } = req.body;

  const result = db
    .update(switchPorts)
    .set({
      label,
      vlanMode,
      pvid,
      trunkVlans: trunkVlans ? JSON.stringify(trunkVlans) : undefined,
    })
    .where(
      eq(switchPorts.switchId, switchId)
    )
    .returning()
    .all()
    .filter((p) => p.portNumber === portNumber);

  if (result.length === 0)
    return res.status(404).json({ error: "Port not found" });
  res.json(result[0]);
});
