import { useState, useCallback } from "react";
import { useApi } from "../hooks/useApi";
import { api } from "../api/client";

const DAYS = [
  { value: "weekday", label: "Wochentags" },
  { value: "weekend", label: "Wochenende" },
  { value: "monday", label: "Montag" },
  { value: "tuesday", label: "Dienstag" },
  { value: "wednesday", label: "Mittwoch" },
  { value: "thursday", label: "Donnerstag" },
  { value: "friday", label: "Freitag" },
  { value: "saturday", label: "Samstag" },
  { value: "sunday", label: "Sonntag" },
];

interface RuleForm {
  dayType: string;
  startTime: string;
  endTime: string;
}

interface ProfileForm {
  name: string;
  deviceId: number | null;
  rules: RuleForm[];
}

const emptyRule: RuleForm = { dayType: "weekday", startTime: "08:00", endTime: "22:00" };
const emptyForm: ProfileForm = { name: "", deviceId: null, rules: [{ ...emptyRule }] };

export function SchedulesPage() {
  const { data: profiles, loading, reload } = useApi(
    useCallback(() => api.profiles.list(), [])
  );
  const { data: devicesData } = useApi(
    useCallback(() => api.devices.list(), [])
  );
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      await api.profiles.update(editId, form);
    } else {
      await api.profiles.create(form);
    }
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm);
    reload();
  };

  const handleEdit = async (p: any) => {
    const full = await api.profiles.get(p.id);
    setForm({
      name: full.name,
      deviceId: full.deviceId,
      rules: full.rules?.length
        ? full.rules.map((r: any) => ({
            dayType: r.dayType,
            startTime: r.startTime,
            endTime: r.endTime,
          }))
        : [{ ...emptyRule }],
    });
    setEditId(p.id);
    setShowForm(true);
  };

  const handleToggle = async (id: number) => {
    await api.profiles.toggle(id);
    reload();
  };

  const handleDelete = async (id: number) => {
    if (confirm("Zeitplan wirklich löschen?")) {
      await api.profiles.delete(id);
      reload();
    }
  };

  const addRule = () => {
    setForm({ ...form, rules: [...form.rules, { ...emptyRule }] });
  };

  const removeRule = (index: number) => {
    setForm({ ...form, rules: form.rules.filter((_, i) => i !== index) });
  };

  const updateRule = (index: number, field: keyof RuleForm, value: string) => {
    const rules = [...form.rules];
    rules[index] = { ...rules[index], [field]: value };
    setForm({ ...form, rules });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Zeitpläne</h1>
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
            placeholder="Profilname"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={form.deviceId ?? ""}
            onChange={(e) =>
              setForm({ ...form, deviceId: e.target.value ? Number(e.target.value) : null })
            }
          >
            <option value="">Gerät auswählen</option>
            {devicesData?.map((d: any) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Regeln (Erlaubte Zeiten):</p>
            {form.rules.map((rule, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm flex-1"
                  value={rule.dayType}
                  onChange={(e) => updateRule(i, "dayType", e.target.value)}
                >
                  {DAYS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
                <input
                  type="time"
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                  value={rule.startTime}
                  onChange={(e) => updateRule(i, "startTime", e.target.value)}
                />
                <span className="text-gray-400">–</span>
                <input
                  type="time"
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                  value={rule.endTime}
                  onChange={(e) => updateRule(i, "endTime", e.target.value)}
                />
                {form.rules.length > 1 && (
                  <button type="button" onClick={() => removeRule(i)} className="text-red-500 text-sm">
                    X
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addRule} className="text-sm text-primary-600 hover:underline">
              + Regel hinzufügen
            </button>
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
      ) : profiles?.length === 0 ? (
        <p className="text-gray-500">Noch keine Zeitpläne vorhanden.</p>
      ) : (
        <div className="space-y-3">
          {profiles?.map((p: any) => (
            <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{p.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {p.isActive ? "Aktiv" : "Inaktiv"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleToggle(p.id)} className="text-sm text-primary-600 hover:underline">
                    {p.isActive ? "Deaktivieren" : "Aktivieren"}
                  </button>
                  <button onClick={() => handleEdit(p)} className="text-sm text-primary-600 hover:underline">
                    Bearbeiten
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="text-sm text-red-600 hover:underline">
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
