import { useState, useCallback } from "react";
import { useApi } from "../hooks/useApi";
import { api } from "../api/client";

interface SwitchForm {
  name: string;
  model: string;
  ipAddress: string;
  portCount: number;
  isManaged: boolean;
  location: string;
}

const emptyForm: SwitchForm = {
  name: "",
  model: "",
  ipAddress: "",
  portCount: 8,
  isManaged: false,
  location: "",
};

export function SwitchesPage() {
  const { data, loading, reload } = useApi(
    useCallback(() => api.switches.list(), [])
  );
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<SwitchForm>(emptyForm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      await api.switches.update(editId, form);
    } else {
      await api.switches.create(form);
    }
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm);
    reload();
  };

  const handleEdit = (sw: any) => {
    setForm({
      name: sw.name,
      model: sw.model || "",
      ipAddress: sw.ipAddress || "",
      portCount: sw.portCount,
      isManaged: sw.isManaged,
      location: sw.location || "",
    });
    setEditId(sw.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Switch wirklich löschen?")) {
      await api.switches.delete(id);
      reload();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Switches</h1>
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
            placeholder="Name (z.B. Wohnzimmer Switch)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Modell"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            />
            <input
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="IP-Adresse"
              value={form.ipAddress}
              onChange={(e) => setForm({ ...form, ipAddress: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Anzahl Ports"
              value={form.portCount}
              onChange={(e) => setForm({ ...form, portCount: Number(e.target.value) })}
            />
            <input
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Standort"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isManaged}
              onChange={(e) => setForm({ ...form, isManaged: e.target.checked })}
            />
            Managed (VLAN-fähig)
          </label>
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
        <p className="text-gray-500">Noch keine Switches vorhanden.</p>
      ) : (
        <div className="space-y-3">
          {data?.map((sw: any) => (
            <div key={sw.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{sw.name}</h3>
                  <p className="text-sm text-gray-500">
                    {sw.model && `${sw.model} · `}
                    {sw.portCount} Ports
                    {sw.isManaged && " · Managed"}
                    {sw.ipAddress && ` · ${sw.ipAddress}`}
                  </p>
                  {sw.location && (
                    <p className="text-xs text-gray-400 mt-1">{sw.location}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(sw)} className="text-sm text-primary-600 hover:underline">
                    Bearbeiten
                  </button>
                  <button onClick={() => handleDelete(sw.id)} className="text-sm text-red-600 hover:underline">
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
