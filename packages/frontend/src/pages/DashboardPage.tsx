import { useCallback } from "react";
import { useApi } from "../hooks/useApi";
import { api } from "../api/client";
import { Link } from "react-router-dom";

export function DashboardPage() {
  const { data: switchesData, loading: loadingSwitches } = useApi(
    useCallback(() => api.switches.list(), [])
  );
  const { data: vlansData, loading: loadingVlans } = useApi(
    useCallback(() => api.vlans.list(), [])
  );
  const { data: devicesData, loading: loadingDevices } = useApi(
    useCallback(() => api.devices.list(), [])
  );
  const { data: profilesData, loading: loadingProfiles } = useApi(
    useCallback(() => api.profiles.list(), [])
  );

  const loading = loadingSwitches || loadingVlans || loadingDevices || loadingProfiles;

  const stats = [
    { label: "Switches", value: switchesData?.length ?? 0, to: "/switches", color: "bg-blue-500" },
    { label: "VLANs", value: vlansData?.length ?? 0, to: "/vlans", color: "bg-green-500" },
    { label: "Geräte", value: devicesData?.length ?? 0, to: "/devices", color: "bg-purple-500" },
    { label: "Zeitpläne", value: profilesData?.length ?? 0, to: "/schedules", color: "bg-orange-500" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      {loading ? (
        <p className="text-gray-500">Laden...</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {stats.map((s) => (
            <Link
              key={s.label}
              to={s.to}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className={`w-10 h-10 ${s.color} rounded-lg flex items-center justify-center text-white text-lg font-bold mb-3`}>
                {s.value}
              </div>
              <p className="text-sm font-medium text-gray-600">{s.label}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
