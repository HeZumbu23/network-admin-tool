import { Router } from "express";
import { db } from "../db/index.js";
import { devices, vlans, switches } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const devicesRouter = Router();

// List all devices (with VLAN and switch names)
devicesRouter.get("/", async (_req, res) => {
  const result = await db
    .select({
      id: devices.id,
      name: devices.name,
      macAddress: devices.macAddress,
      ipAddress: devices.ipAddress,
      vlanId: devices.vlanId,
      vlanName: vlans.name,
      switchId: devices.switchId,
      switchName: switches.name,
      portNumber: devices.portNumber,
      deviceType: devices.deviceType,
      isOnline: devices.isOnline,
    })
    .from(devices)
    .leftJoin(vlans, eq(devices.vlanId, vlans.id))
    .leftJoin(switches, eq(devices.switchId, switches.id));
  res.json(result);
});

// Create device
devicesRouter.post("/", async (req, res) => {
  const { name, macAddress, ipAddress, vlanId, switchId, portNumber, deviceType } = req.body;
  const [result] = await db
    .insert(devices)
    .values({ name, macAddress, ipAddress, vlanId, switchId, portNumber, deviceType })
    .returning();
  res.status(201).json(result);
});

// Update device
devicesRouter.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, macAddress, ipAddress, vlanId, switchId, portNumber, deviceType, isOnline } = req.body;
  const [result] = await db
    .update(devices)
    .set({ name, macAddress, ipAddress, vlanId, switchId, portNumber, deviceType, isOnline })
    .where(eq(devices.id, id))
    .returning();
  if (!result) return res.status(404).json({ error: "Device not found" });
  res.json(result);
});

// Delete device
devicesRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(devices).where(eq(devices.id, id));
  res.json({ success: true });
});
