import { Router } from "express";
import { db } from "../db/index.js";
import { switches, connections } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const topologyRouter = Router();

// Get full topology (switches + connections)
topologyRouter.get("/", async (_req, res) => {
  const allSwitches = await db.select().from(switches);
  const allConnections = await db.select().from(connections);
  res.json({ switches: allSwitches, connections: allConnections });
});

// Save switch positions on canvas
topologyRouter.put("/positions", async (req, res) => {
  const positions: Array<{ id: number; posX: number; posY: number }> = req.body;
  await Promise.all(
    positions.map((pos) =>
      db.update(switches).set({ posX: pos.posX, posY: pos.posY }).where(eq(switches.id, pos.id))
    )
  );
  res.json({ success: true });
});

// Create connection between switches
topologyRouter.post("/connections", async (req, res) => {
  const { fromSwitchId, fromPort, toSwitchId, toPort, linkType } = req.body;
  const [result] = await db
    .insert(connections)
    .values({ fromSwitchId, fromPort, toSwitchId, toPort, linkType })
    .returning();
  res.status(201).json(result);
});

// Delete connection
topologyRouter.delete("/connections/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(connections).where(eq(connections.id, id));
  res.json({ success: true });
});
