import { Router } from "express";
import { db } from "../db/index.js";
import { scenarios, switches, vlans } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";

export const scenariosRouter = Router();

// List all scenarios with switch/vlan counts
scenariosRouter.get("/", (_req, res) => {
  const allScenarios = db.select().from(scenarios).all();

  const result = allScenarios.map((s) => {
    const switchCount = db
      .select({ count: sql<number>`count(*)` })
      .from(switches)
      .where(eq(switches.scenarioId, s.id))
      .get();
    const vlanCount = db
      .select({ count: sql<number>`count(*)` })
      .from(vlans)
      .where(eq(vlans.scenarioId, s.id))
      .get();

    return {
      ...s,
      switchCount: switchCount?.count ?? 0,
      vlanCount: vlanCount?.count ?? 0,
    };
  });

  res.json(result);
});

// Get single scenario
scenariosRouter.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  const scenario = db.select().from(scenarios).where(eq(scenarios.id, id)).get();
  if (!scenario) return res.status(404).json({ error: "Scenario not found" });
  res.json(scenario);
});

// Create scenario
scenariosRouter.post("/", (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });

  const result = db
    .insert(scenarios)
    .values({ name, description, isActive: false })
    .returning()
    .get();

  res.status(201).json(result);
});

// Update scenario
scenariosRouter.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  const { name, description } = req.body;

  const result = db
    .update(scenarios)
    .set({ name, description })
    .where(eq(scenarios.id, id))
    .returning()
    .get();

  if (!result) return res.status(404).json({ error: "Scenario not found" });
  res.json(result);
});

// Delete scenario (cascades to switches and vlans)
scenariosRouter.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  db.delete(scenarios).where(eq(scenarios.id, id)).run();
  res.json({ success: true });
});

// Activate a scenario (deactivates all others)
scenariosRouter.post("/:id/activate", (req, res) => {
  const id = Number(req.params.id);
  const scenario = db.select().from(scenarios).where(eq(scenarios.id, id)).get();
  if (!scenario) return res.status(404).json({ error: "Scenario not found" });

  // Deactivate all
  db.update(scenarios).set({ isActive: false }).run();
  // Activate selected
  const result = db
    .update(scenarios)
    .set({ isActive: true })
    .where(eq(scenarios.id, id))
    .returning()
    .get();

  res.json(result);
});

// Deactivate all scenarios
scenariosRouter.post("/deactivate-all", (_req, res) => {
  db.update(scenarios).set({ isActive: false }).run();
  res.json({ success: true });
});
