import { Router } from "express";
import { db } from "../db/index.js";
import { scenarios, switches, vlans } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";

export const scenariosRouter = Router();

// List all scenarios with switch/vlan counts
scenariosRouter.get("/", async (_req, res) => {
  const allScenarios = await db.select().from(scenarios);

  const result = await Promise.all(
    allScenarios.map(async (s) => {
      const [switchCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(switches)
        .where(eq(switches.scenarioId, s.id));
      const [vlanCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(vlans)
        .where(eq(vlans.scenarioId, s.id));
      return {
        ...s,
        switchCount: switchCount?.count ?? 0,
        vlanCount: vlanCount?.count ?? 0,
      };
    })
  );

  res.json(result);
});

// Get single scenario
scenariosRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [scenario] = await db.select().from(scenarios).where(eq(scenarios.id, id));
  if (!scenario) return res.status(404).json({ error: "Scenario not found" });
  res.json(scenario);
});

// Create scenario
scenariosRouter.post("/", async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });

  const [result] = await db
    .insert(scenarios)
    .values({ name, description, isActive: false })
    .returning();

  res.status(201).json(result);
});

// Update scenario
scenariosRouter.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, description } = req.body;

  const [result] = await db
    .update(scenarios)
    .set({ name, description })
    .where(eq(scenarios.id, id))
    .returning();

  if (!result) return res.status(404).json({ error: "Scenario not found" });
  res.json(result);
});

// Delete scenario (cascades to switches and vlans)
scenariosRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(scenarios).where(eq(scenarios.id, id));
  res.json({ success: true });
});

// Activate a scenario (deactivates all others)
scenariosRouter.post("/:id/activate", async (req, res) => {
  const id = Number(req.params.id);
  const [scenario] = await db.select().from(scenarios).where(eq(scenarios.id, id));
  if (!scenario) return res.status(404).json({ error: "Scenario not found" });

  await db.update(scenarios).set({ isActive: false });
  const [result] = await db
    .update(scenarios)
    .set({ isActive: true })
    .where(eq(scenarios.id, id))
    .returning();

  res.json(result);
});

// Deactivate all scenarios
scenariosRouter.post("/deactivate-all", async (_req, res) => {
  await db.update(scenarios).set({ isActive: false });
  res.json({ success: true });
});
