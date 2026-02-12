import { Router } from "express";
import { db } from "../db/index.js";
import { accessProfiles, scheduleRules } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const profilesRouter = Router();

// List all profiles
profilesRouter.get("/", (_req, res) => {
  const result = db.select().from(accessProfiles).all();
  res.json(result);
});

// Get profile with schedule rules
profilesRouter.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  const profile = db
    .select()
    .from(accessProfiles)
    .where(eq(accessProfiles.id, id))
    .get();
  if (!profile) return res.status(404).json({ error: "Profile not found" });

  const rules = db
    .select()
    .from(scheduleRules)
    .where(eq(scheduleRules.profileId, id))
    .all();
  res.json({ ...profile, rules });
});

// Create profile with rules
profilesRouter.post("/", (req, res) => {
  const { name, deviceId, isActive, rules } = req.body;
  const profile = db
    .insert(accessProfiles)
    .values({ name, deviceId, isActive })
    .returning()
    .get();

  const createdRules = (rules || []).map(
    (rule: { dayType: string; startTime: string; endTime: string }) =>
      db
        .insert(scheduleRules)
        .values({
          profileId: profile.id,
          dayType: rule.dayType,
          startTime: rule.startTime,
          endTime: rule.endTime,
        })
        .returning()
        .get()
  );

  res.status(201).json({ ...profile, rules: createdRules });
});

// Update profile and rules (replace all rules)
profilesRouter.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  const { name, deviceId, isActive, rules } = req.body;

  const profile = db
    .update(accessProfiles)
    .set({ name, deviceId, isActive })
    .where(eq(accessProfiles.id, id))
    .returning()
    .get();
  if (!profile) return res.status(404).json({ error: "Profile not found" });

  // Replace all rules
  db.delete(scheduleRules).where(eq(scheduleRules.profileId, id)).run();
  const createdRules = (rules || []).map(
    (rule: { dayType: string; startTime: string; endTime: string }) =>
      db
        .insert(scheduleRules)
        .values({
          profileId: id,
          dayType: rule.dayType,
          startTime: rule.startTime,
          endTime: rule.endTime,
        })
        .returning()
        .get()
  );

  res.json({ ...profile, rules: createdRules });
});

// Toggle profile active/inactive
profilesRouter.post("/:id/toggle", (req, res) => {
  const id = Number(req.params.id);
  const profile = db
    .select()
    .from(accessProfiles)
    .where(eq(accessProfiles.id, id))
    .get();
  if (!profile) return res.status(404).json({ error: "Profile not found" });

  const updated = db
    .update(accessProfiles)
    .set({ isActive: !profile.isActive })
    .where(eq(accessProfiles.id, id))
    .returning()
    .get();
  res.json(updated);
});

// Delete profile
profilesRouter.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  db.delete(accessProfiles).where(eq(accessProfiles.id, id)).run();
  res.json({ success: true });
});
