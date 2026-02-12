import { Router } from "express";
import { db } from "../db/index.js";
import { accessProfiles, scheduleRules } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const profilesRouter = Router();

// List all profiles
profilesRouter.get("/", async (_req, res) => {
  const result = await db.select().from(accessProfiles);
  res.json(result);
});

// Get profile with schedule rules
profilesRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [profile] = await db.select().from(accessProfiles).where(eq(accessProfiles.id, id));
  if (!profile) return res.status(404).json({ error: "Profile not found" });

  const rules = await db.select().from(scheduleRules).where(eq(scheduleRules.profileId, id));
  res.json({ ...profile, rules });
});

// Create profile with rules
profilesRouter.post("/", async (req, res) => {
  const { name, deviceId, isActive, rules } = req.body;
  const [profile] = await db.insert(accessProfiles).values({ name, deviceId, isActive }).returning();

  const createdRules = await Promise.all(
    (rules || []).map((rule: { dayType: string; startTime: string; endTime: string }) =>
      db
        .insert(scheduleRules)
        .values({ profileId: profile.id, dayType: rule.dayType, startTime: rule.startTime, endTime: rule.endTime })
        .returning()
        .then((r) => r[0])
    )
  );

  res.status(201).json({ ...profile, rules: createdRules });
});

// Update profile and rules (replace all rules)
profilesRouter.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, deviceId, isActive, rules } = req.body;

  const [profile] = await db
    .update(accessProfiles)
    .set({ name, deviceId, isActive })
    .where(eq(accessProfiles.id, id))
    .returning();
  if (!profile) return res.status(404).json({ error: "Profile not found" });

  await db.delete(scheduleRules).where(eq(scheduleRules.profileId, id));
  const createdRules = await Promise.all(
    (rules || []).map((rule: { dayType: string; startTime: string; endTime: string }) =>
      db
        .insert(scheduleRules)
        .values({ profileId: id, dayType: rule.dayType, startTime: rule.startTime, endTime: rule.endTime })
        .returning()
        .then((r) => r[0])
    )
  );

  res.json({ ...profile, rules: createdRules });
});

// Toggle profile active/inactive
profilesRouter.post("/:id/toggle", async (req, res) => {
  const id = Number(req.params.id);
  const [profile] = await db.select().from(accessProfiles).where(eq(accessProfiles.id, id));
  if (!profile) return res.status(404).json({ error: "Profile not found" });

  const [updated] = await db
    .update(accessProfiles)
    .set({ isActive: !profile.isActive })
    .where(eq(accessProfiles.id, id))
    .returning();
  res.json(updated);
});

// Delete profile
profilesRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(accessProfiles).where(eq(accessProfiles.id, id));
  res.json({ success: true });
});
