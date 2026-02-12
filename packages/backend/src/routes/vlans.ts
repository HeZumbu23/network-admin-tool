import { Router } from "express";
import { db } from "../db/index.js";
import { vlans } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const vlansRouter = Router();

// List all VLANs
vlansRouter.get("/", (_req, res) => {
  const result = db.select().from(vlans).all();
  res.json(result);
});

// Create VLAN
vlansRouter.post("/", (req, res) => {
  const { vlanId, name, subnet, gateway, dhcpEnabled, dhcpRange, description } =
    req.body;
  const result = db
    .insert(vlans)
    .values({ vlanId, name, subnet, gateway, dhcpEnabled, dhcpRange, description })
    .returning()
    .get();
  res.status(201).json(result);
});

// Update VLAN
vlansRouter.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  const { vlanId, name, subnet, gateway, dhcpEnabled, dhcpRange, description } =
    req.body;
  const result = db
    .update(vlans)
    .set({ vlanId, name, subnet, gateway, dhcpEnabled, dhcpRange, description })
    .where(eq(vlans.id, id))
    .returning()
    .get();
  if (!result) return res.status(404).json({ error: "VLAN not found" });
  res.json(result);
});

// Delete VLAN
vlansRouter.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  db.delete(vlans).where(eq(vlans.id, id)).run();
  res.json({ success: true });
});
