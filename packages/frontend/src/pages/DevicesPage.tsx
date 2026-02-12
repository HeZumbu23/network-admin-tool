import { useState, useCallback } from "react";
import { useApi } from "../hooks/useApi";
import { api } from "../api/client";

const DEVICE_TYPES = ["tv", "phone", "laptop", "tablet", "iot", "server", "printer", "other"];

interface DeviceForm {
  name: string;
  macAddress: string;
  ipAddress: string;
  vlanId: number | null;
  deviceType: string;
}

const emptyForm: DeviceForm = {
  name: "",
  macAddress: "",
  ipAddress: "",
  vlanId: null,
  deviceType: "other",
};

export function DevicesPage() {
  const { data, loading, reload } = useApi(
    useCallback(() => api.devices.list(), [])
  );
  const { data: vlansData } = useApi(
    useCallback(() => api.vlans.list(), [])
  );
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<DeviceForm>(emptyForm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      await api.devices.update(editId, form);
    } else {
      await api.devices.create(form);
    }
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm);
    reload();
  };

  const handleEdit = (d: any) => {
    setForm({
      name: d.name,
      macAddress: d.macAddress,
      ipAddress: d.ipAddress || "",
      vlanId: d.vlanId,
      deviceType: d.deviceType || "other",
    });
    setEditId(d.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Gerät wirklich löschen?")) {
      await api.devices.delete(id);
      reload();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Geräte</h1>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
        >
          + Neu
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 space-y-3">
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="Name (z.B. LG OLED TV)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="MAC-Adresse"
              value={form.macAddress}
              onChange={(e) => setForm({ ...form, macAddress: e.target.value })}
              required
            />
            <input
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="IP-Adresse"
              value={form.ipAddress}
              onChange={(e) => setForm({ ...form, ipAddress: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.deviceType}
              onChange={(e) => setForm({ ...form, deviceType: e.target.value })}
            >
              {DEVICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.vlanId ?? ""}
              onChange={(e) =>
                setForm({ ...form, vlanId: e.target.value ? Number(e.target.value) : null })
              }
            >
              <option value="">Kein VLAN</option>
              {vlansData?.map((v: any) => (
                <option key={v.id} value={v.id}>
                  VLAN {v.vlanId} — {v.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700">
              {editId ? "Speichern" : "Erstellen"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50">
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500">Laden...</p>
      ) : data?.length === 0 ? (
        <p className="text-gray-500">Noch keine Geräte vorhanden.</p>
      ) : (
        <div className="space-y-3">
          {data?.map((d: any) => (
            <div key={d.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">
                    {d.name}
                    <span className={`ml-2 inline-block w-2 h-2 rounded-full ${d.isOnline ? "bg-green-500" : "bg-gray-300"}`} />
                  </h3>
                  <p className="text-sm text-gray-500">
                    {d.macAddress}
                    {d.ipAddress && ` · ${d.ipAddress}`}
                    {d.vlanName && ` · VLAN: ${d.vlanName}`}
                  </p>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full mt-1 inline-block">
                    {d.deviceType}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(d)} className="text-sm text-primary-600 hover:underline">
                    Bearbeiten
                  </button>
                  <button onClick={() => handleDelete(d.id)} className="text-sm text-red-600 hover:underline">
                    Löschen
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
