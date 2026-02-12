import express from "express";
import cors from "cors";
import { switchesRouter } from "./routes/switches.js";
import { vlansRouter } from "./routes/vlans.js";
import { devicesRouter } from "./routes/devices.js";
import { profilesRouter } from "./routes/profiles.js";
import { topologyRouter } from "./routes/topology.js";
import { scenariosRouter } from "./routes/scenarios.js";
import { mikrotikImportRouter } from "./routes/mikrotik-import.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// API routes
app.use("/api/switches", switchesRouter);
app.use("/api/vlans", vlansRouter);
app.use("/api/devices", devicesRouter);
app.use("/api/profiles", profilesRouter);
app.use("/api/topology", topologyRouter);
app.use("/api/scenarios", scenariosRouter);
app.use("/api/mikrotik-import", mikrotikImportRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
