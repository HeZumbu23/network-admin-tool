import { Router } from "express";
import { db } from "../db/index.js";
import { scenarios, switches, switchPorts, vlans } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { parseMikrotikScript } from "../services/mikrotik-parser.js";

export const mikrotikImportRouter = Router();

/**
 * POST /api/mikrotik-import/preview
 * Parse a RSC script and return what would be imported (dry-run).
 */
mikrotikImportRouter.post("/preview", (req, res) => {
  const { script } = req.body;
  if (!script) return res.status(400).json({ error: "script is required" });

  const result = parseMikrotikScript(script);
  res.json(result);
});

/**
 * POST /api/mikrotik-import/import
 * Parse and import a RSC script into a scenario.
 * Body: { script: string, scenarioId?: number, scenarioName?: string }
 * If scenarioId is provided, imports into existing scenario.
 * If scenarioName is provided (and no scenarioId), creates a new scenario.
 */
mikrotikImportRouter.post("/import", (req, res) => {
  const { script, scenarioId: existingScenarioId, scenarioName } = req.body;
  if (!script) return res.status(400).json({ error: "script is required" });

  const parsed = parseMikrotikScript(script);

  if (parsed.devices.length === 0) {
    return res.status(400).json({
      error: "Keine Geräte im Script gefunden.",
      warnings: parsed.warnings,
    });
  }

  let scenarioId: number;

  if (existingScenarioId) {
    // Verify scenario exists
    const existing = db.select().from(scenarios).where(eq(scenarios.id, Number(existingScenarioId))).get();
    if (!existing) return res.status(404).json({ error: "Scenario not found" });
    scenarioId = existing.id;
  } else {
    // Create new scenario
    const name = scenarioName || parsed.devices[0]?.name || "Importiertes Netzwerk";
    const newScenario = db
      .insert(scenarios)
      .values({ name, description: `Importiert aus Mikrotik RSC`, isActive: false })
      .returning()
      .get();
    scenarioId = newScenario.id;
  }

  const importedSwitches: any[] = [];
  const importedVlans: any[] = [];

  // Import VLANs first (from router device)
  for (const device of parsed.devices) {
    for (const parsedVlan of device.vlans) {
      // Check if VLAN with same ID already exists in this scenario
      const existing = db
        .select()
        .from(vlans)
        .where(and(eq(vlans.scenarioId, scenarioId), eq(vlans.vlanId, parsedVlan.vlanId)))
        .get();

      if (!existing) {
        const newVlan = db
          .insert(vlans)
          .values({
            scenarioId,
            vlanId: parsedVlan.vlanId,
            name: parsedVlan.name,
            subnet: parsedVlan.subnet,
            gateway: parsedVlan.gateway,
            dhcpEnabled: parsedVlan.dhcpEnabled,
            dhcpRange: parsedVlan.dhcpRange,
            description: parsedVlan.description,
          })
          .returning()
          .get();
        importedVlans.push(newVlan);
      } else {
        // Update existing
        db.update(vlans)
          .set({
            name: parsedVlan.name,
            subnet: parsedVlan.subnet,
            gateway: parsedVlan.gateway,
            dhcpEnabled: parsedVlan.dhcpEnabled,
            dhcpRange: parsedVlan.dhcpRange,
            description: parsedVlan.description,
          })
          .where(eq(vlans.id, existing.id))
          .run();
        importedVlans.push(existing);
      }
    }
  }

  // Import switches/routers
  for (const device of parsed.devices) {
    const newSwitch = db
      .insert(switches)
      .values({
        scenarioId,
        name: device.name,
        model: device.deviceType === "router" ? "Mikrotik Router" : "Mikrotik Switch",
        portCount: device.portCount,
        isManaged: true,
        location: "",
        posX: importedSwitches.length * 300,
        posY: 100,
      })
      .returning()
      .get();

    // Create ports
    for (const port of device.ports) {
      db.insert(switchPorts)
        .values({
          switchId: newSwitch.id,
          portNumber: port.portNumber,
          label: port.comment || port.interfaceName,
          vlanMode: port.vlanMode,
          pvid: port.pvid,
          trunkVlans: JSON.stringify(port.trunkVlans),
        })
        .run();
    }

    // Fill remaining ports if device has more ports than explicitly configured
    const configuredPorts = new Set(device.ports.map((p) => p.portNumber));
    for (let i = 1; i <= device.portCount; i++) {
      if (!configuredPorts.has(i)) {
        db.insert(switchPorts)
          .values({
            switchId: newSwitch.id,
            portNumber: i,
            label: `ether${i}`,
            vlanMode: "access",
            pvid: 1,
            trunkVlans: "[]",
          })
          .run();
      }
    }

    importedSwitches.push(newSwitch);
  }

  res.status(201).json({
    scenarioId,
    importedSwitches: importedSwitches.length,
    importedVlans: importedVlans.length,
    warnings: parsed.warnings,
    devices: parsed.devices.map((d) => ({ name: d.name, deviceType: d.deviceType, portCount: d.portCount })),
  });
});
