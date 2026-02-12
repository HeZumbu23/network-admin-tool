import { Router } from "express";
import { db } from "../db/index.js";
import { vlans } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const vlansRouter = Router();

// List all VLANs
vlansRouter.get("/", async (_req, res) => {
  const result = await db.select().from(vlans);
  res.json(result);
});

// Create VLAN
vlansRouter.post("/", async (req, res) => {
  const { vlanId, name, subnet, gateway, dhcpEnabled, dhcpRange, description } = req.body;
  const [result] = await db
    .insert(vlans)
    .values({ vlanId, name, subnet, gateway, dhcpEnabled, dhcpRange, description })
    .returning();
  res.status(201).json(result);
});

// Update VLAN
vlansRouter.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { vlanId, name, subnet, gateway, dhcpEnabled, dhcpRange, description } = req.body;
  const [result] = await db
    .update(vlans)
    .set({ vlanId, name, subnet, gateway, dhcpEnabled, dhcpRange, description })
    .where(eq(vlans.id, id))
    .returning();
  if (!result) return res.status(404).json({ error: "VLAN not found" });
  res.json(result);
});

// Delete VLAN
vlansRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(vlans).where(eq(vlans.id, id));
  res.json({ success: true });
});
