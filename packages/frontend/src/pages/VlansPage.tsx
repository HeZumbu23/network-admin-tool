import { useState, useCallback } from "react";
import { useApi } from "../hooks/useApi";
import { api } from "../api/client";

interface VlanForm {
  vlanId: number;
  name: string;
  subnet: string;
  gateway: string;
  dhcpEnabled: boolean;
  dhcpRange: string;
  description: string;
}

const emptyForm: VlanForm = {
  vlanId: 10,
  name: "",
  subnet: "",
  gateway: "",
  dhcpEnabled: false,
  dhcpRange: "",
  description: "",
};

export function VlansPage() {
  const { data, loading, reload } = useApi(
    useCallback(() => api.vlans.list(), [])
  );
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<VlanForm>(emptyForm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      await api.vlans.update(editId, form);
    } else {
      await api.vlans.create(form);
    }
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm);
    reload();
  };

  const handleEdit = (v: any) => {
    setForm({
      vlanId: v.vlanId,
      name: v.name,
      subnet: v.subnet || "",
      gateway: v.gateway || "",
      dhcpEnabled: v.dhcpEnabled || false,
      dhcpRange: v.dhcpRange || "",
      description: v.description || "",
    });
    setEditId(v.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("VLAN wirklich löschen?")) {
      await api.vlans.delete(id);
      reload();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">VLANs</h1>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
        >
          + Neu
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="VLAN ID (1-4094)"
              value={form.vlanId}
              onChange={(e) => setForm({ ...form, vlanId: Number(e.target.value) })}
              required
              min={1}
              max={4094}
            />
            <input
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Name (z.B. IoT)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Subnetz (z.B. 192.168.10.0/24)"
              value={form.subnet}
              onChange={(e) => setForm({ ...form, subnet: e.target.value })}
            />
            <input
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Gateway (z.B. 192.168.10.1)"
              value={form.gateway}
              onChange={(e) => setForm({ ...form, gateway: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.dhcpEnabled}
              onChange={(e) => setForm({ ...form, dhcpEnabled: e.target.checked })}
            />
            DHCP aktiviert
          </label>
          {form.dhcpEnabled && (
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="DHCP Range (z.B. 192.168.10.100-192.168.10.200)"
              value={form.dhcpRange}
              onChange={(e) => setForm({ ...form, dhcpRange: e.target.value })}
            />
          )}
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="Beschreibung"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
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
        <p className="text-gray-500">Noch keine VLANs vorhanden.</p>
      ) : (
        <div className="space-y-3">
          {data?.map((v: any) => (
            <div key={v.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">
                    <span className="text-primary-600">VLAN {v.vlanId}</span> — {v.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {v.subnet && `${v.subnet}`}
                    {v.gateway && ` · GW: ${v.gateway}`}
                    {v.dhcpEnabled && " · DHCP"}
                  </p>
                  {v.description && (
                    <p className="text-xs text-gray-400 mt-1">{v.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(v)} className="text-sm text-primary-600 hover:underline">
                    Bearbeiten
                  </button>
                  <button onClick={() => handleDelete(v.id)} className="text-sm text-red-600 hover:underline">
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
