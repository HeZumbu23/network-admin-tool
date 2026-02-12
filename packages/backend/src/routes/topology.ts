import { Router } from "express";
import { db } from "../db/index.js";
import { switches, connections } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const topologyRouter = Router();

// Get full topology (switches + connections)
topologyRouter.get("/", (_req, res) => {
  const allSwitches = db.select().from(switches).all();
  const allConnections = db.select().from(connections).all();
  res.json({ switches: allSwitches, connections: allConnections });
});

// Save switch positions on canvas
topologyRouter.put("/positions", (req, res) => {
  const positions: Array<{ id: number; posX: number; posY: number }> = req.body;
  for (const pos of positions) {
    db.update(switches)
      .set({ posX: pos.posX, posY: pos.posY })
      .where(eq(switches.id, pos.id))
      .run();
  }
  res.json({ success: true });
});

// Create connection between switches
topologyRouter.post("/connections", (req, res) => {
  const { fromSwitchId, fromPort, toSwitchId, toPort, linkType } = req.body;
  const result = db
    .insert(connections)
    .values({ fromSwitchId, fromPort, toSwitchId, toPort, linkType })
    .returning()
    .get();
  res.status(201).json(result);
});

// Delete connection
topologyRouter.delete("/connections/:id", (req, res) => {
  const id = Number(req.params.id);
  db.delete(connections).where(eq(connections.id, id)).run();
  res.json({ success: true });
});
