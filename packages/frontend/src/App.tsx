import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { DashboardPage } from "./pages/DashboardPage";
import { SwitchesPage } from "./pages/SwitchesPage";
import { VlansPage } from "./pages/VlansPage";
import { DevicesPage } from "./pages/DevicesPage";
import { TopologyPage } from "./pages/TopologyPage";
import { SchedulesPage } from "./pages/SchedulesPage";
import { ScenariosPage } from "./pages/ScenariosPage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/scenarios" element={<ScenariosPage />} />
        <Route path="/switches" element={<SwitchesPage />} />
        <Route path="/vlans" element={<VlansPage />} />
        <Route path="/devices" element={<DevicesPage />} />
        <Route path="/topology" element={<TopologyPage />} />
        <Route path="/schedules" element={<SchedulesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
