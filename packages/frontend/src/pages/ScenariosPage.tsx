import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";

interface Scenario {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  switchCount: number;
  vlanCount: number;
}

interface ImportPreview {
  devices: Array<{
    name: string;
    deviceType: string;
    portCount: number;
    ports: any[];
    vlans: Array<{ vlanId: number; name: string; subnet?: string; gateway?: string }>;
  }>;
  warnings: string[];
}

// ─── Mikrotik Import Modal ────────────────────────────────────────────────────

function MikrotikImportModal({
  scenarios,
  onClose,
  onImported,
}: {
  scenarios: Scenario[];
  onClose: () => void;
  onImported: () => void;
}) {
  const [step, setStep] = useState<"input" | "preview" | "target" | "done">("input");
  const [script, setScript] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [targetMode, setTargetMode] = useState<"new" | "existing">("new");
  const [scenarioName, setScenarioName] = useState("");
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handlePreview = async () => {
    if (!script.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.mikrotikImport.preview(script);
      setPreview(data);
      if (data.devices.length > 0) {
        setScenarioName(data.devices[0].name);
        setStep("preview");
      } else {
        setError("Keine Geräte im Script gefunden. Bitte prüfe das RSC-Format.");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.mikrotikImport.import({
        script,
        scenarioName: targetMode === "new" ? scenarioName : undefined,
        scenarioId: targetMode === "existing" && selectedScenarioId ? Number(selectedScenarioId) : undefined,
      });
      setResult(data);
      setStep("done");
      onImported();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Mikrotik Script importieren</h2>
            <p className="text-sm text-gray-500">RSC-Exportdatei einlesen und Topologie aufbauen</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Step: Script eingeben */}
          {step === "input" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Füge den Inhalt deiner Mikrotik RSC-Exportdatei ein (z.B.{" "}
                <code className="bg-gray-100 px-1 rounded text-xs">mikrotik-vlan-config.rsc</code> oder{" "}
                <code className="bg-gray-100 px-1 rounded text-xs">mikrotik-switch-config.rsc</code>).
              </p>
              <textarea
                className="w-full h-64 p-3 border border-gray-300 rounded-xl font-mono text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                placeholder="# MikroTik Script&#10;/interface vlan&#10;add name=vlan20-trusted vlan-id=20 ..."
                value={script}
                onChange={(e) => setScript(e.target.value)}
              />
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            </div>
          )}

          {/* Step: Vorschau */}
          {step === "preview" && preview && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-sm font-medium text-green-800">
                  Script erfolgreich analysiert — {preview.devices.length} Gerät(e) gefunden
                </p>
              </div>

              {preview.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 space-y-1">
                  {preview.warnings.map((w, i) => (
                    <p key={i} className="text-sm text-yellow-800">⚠ {w}</p>
                  ))}
                </div>
              )}

              {preview.devices.map((device, i) => (
                <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      device.deviceType === "router"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    }`}>
                      {device.deviceType === "router" ? "Router" : "Switch"}
                    </span>
                    <span className="font-medium text-gray-900">{device.name}</span>
                    <span className="text-sm text-gray-500 ml-auto">{device.portCount} Ports</span>
                  </div>

                  {device.vlans.length > 0 && (
                    <div className="p-3">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        {device.vlans.length} VLANs
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {device.vlans.map((v) => (
                          <div key={v.vlanId} className="bg-gray-50 rounded-lg px-2 py-1.5 text-xs">
                            <span className="font-mono text-gray-500 mr-1">VLAN {v.vlanId}</span>
                            <span className="text-gray-700">{v.name}</span>
                            {v.subnet && (
                              <div className="text-gray-400 font-mono">{v.subnet}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Ziel-Szenario wählen */}
              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium text-gray-700">Importziel</p>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="targetMode"
                      value="new"
                      checked={targetMode === "new"}
                      onChange={() => setTargetMode("new")}
                      className="accent-primary-600"
                    />
                    <span className="text-sm text-gray-700">Neues Szenario</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="targetMode"
                      value="existing"
                      checked={targetMode === "existing"}
                      onChange={() => setTargetMode("existing")}
                      className="accent-primary-600"
                      disabled={scenarios.length === 0}
                    />
                    <span className={`text-sm ${scenarios.length === 0 ? "text-gray-400" : "text-gray-700"}`}>
                      Bestehendes Szenario
                    </span>
                  </label>
                </div>

                {targetMode === "new" ? (
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Szenario-Name"
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                  />
                ) : (
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={selectedScenarioId}
                    onChange={(e) => setSelectedScenarioId(e.target.value ? Number(e.target.value) : "")}
                  >
                    <option value="">Szenario wählen...</option>
                    {scenarios.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            </div>
          )}

          {/* Step: Fertig */}
          {step === "done" && result && (
            <div className="space-y-4 text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Import erfolgreich!</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {result.importedSwitches} Switch(es) und {result.importedVlans} VLAN(s) wurden importiert.
                </p>
              </div>
              {result.warnings?.length > 0 && (
                <div className="text-left bg-yellow-50 border border-yellow-200 rounded-xl p-3 space-y-1">
                  {result.warnings.map((w: string, i: number) => (
                    <p key={i} className="text-sm text-yellow-800">⚠ {w}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-200">
          {step === "input" && (
            <>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handlePreview}
                disabled={!script.trim() || loading}
                className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? "Analysiere..." : "Script analysieren"}
              </button>
            </>
          )}
          {step === "preview" && (
            <>
              <button
                onClick={() => { setStep("input"); setError(null); }}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                Zurück
              </button>
              <button
                onClick={handleImport}
                disabled={loading || (targetMode === "new" && !scenarioName.trim()) || (targetMode === "existing" && !selectedScenarioId)}
                className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? "Importiere..." : "Jetzt importieren"}
              </button>
            </>
          )}
          {step === "done" && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700"
            >
              Schließen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Edit Scenario Modal ──────────────────────────────────────────────────────

function EditScenarioModal({
  scenario,
  onClose,
  onSaved,
}: {
  scenario: Scenario | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(scenario?.name || "");
  const [description, setDescription] = useState(scenario?.description || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      if (scenario) {
        await api.scenarios.update(scenario.id, { name, description });
      } else {
        await api.scenarios.create({ name, description });
      }
      onSaved();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {scenario ? "Szenario bearbeiten" : "Neues Szenario"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Heimnetz Produktion"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optionale Beschreibung..."
            />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        </div>
        <div className="flex gap-3 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || loading}
            className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? "Speichern..." : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [editScenario, setEditScenario] = useState<Scenario | null | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadScenarios = useCallback(async () => {
    try {
      const data = await api.scenarios.list();
      setScenarios(data);
    } catch (e) {
      console.error("Failed to load scenarios", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScenarios();
  }, [loadScenarios]);

  const handleActivate = async (id: number) => {
    await api.scenarios.activate(id);
    loadScenarios();
  };

  const handleDeactivateAll = async () => {
    await api.scenarios.deactivateAll();
    loadScenarios();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Szenario wirklich löschen? Alle zugehörigen Switches und VLANs werden ebenfalls gelöscht.")) return;
    setDeletingId(id);
    try {
      await api.scenarios.delete(id);
      loadScenarios();
    } finally {
      setDeletingId(null);
    }
  };

  const activeScenario = scenarios.find((s) => s.isActive);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Szenarien</h1>
          <p className="text-sm text-gray-500 mt-1">Verwalte verschiedene Netzwerkkonfigurationen</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-700"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Mikrotik Import
          </button>
          <button
            onClick={() => setEditScenario(null)}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Neu
          </button>
        </div>
      </div>

      {/* Active scenario banner */}
      {activeScenario && (
        <div className="bg-primary-50 border border-primary-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-primary-500 rounded-full animate-pulse" />
            <div>
              <p className="text-sm font-medium text-primary-900">Aktives Szenario</p>
              <p className="text-xs text-primary-700">{activeScenario.name}</p>
            </div>
          </div>
          <button
            onClick={handleDeactivateAll}
            className="text-xs text-primary-600 hover:text-primary-800 font-medium"
          >
            Deaktivieren
          </button>
        </div>
      )}

      {/* Scenario list */}
      {scenarios.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="font-medium">Noch keine Szenarien</p>
          <p className="text-sm mt-1">Erstelle ein neues Szenario oder importiere ein Mikrotik-Script.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className={`bg-white rounded-2xl border-2 transition-colors ${
                scenario.isActive ? "border-primary-400" : "border-gray-100 hover:border-gray-200"
              } p-4`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 truncate">{scenario.name}</h3>
                    {scenario.isActive && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full font-medium">
                        <span className="w-1.5 h-1.5 bg-primary-500 rounded-full" />
                        Aktiv
                      </span>
                    )}
                  </div>
                  {scenario.description && (
                    <p className="text-sm text-gray-500 mt-0.5 truncate">{scenario.description}</p>
                  )}
                  <div className="flex gap-3 mt-2 text-xs text-gray-400">
                    <span>{scenario.switchCount} Switch(es)</span>
                    <span>{scenario.vlanCount} VLAN(s)</span>
                    <span>{new Date(scenario.createdAt).toLocaleDateString("de-DE")}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {!scenario.isActive && (
                    <button
                      onClick={() => handleActivate(scenario.id)}
                      title="Aktivieren"
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => setEditScenario(scenario)}
                    title="Bearbeiten"
                    className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(scenario.id)}
                    disabled={deletingId === scenario.id}
                    title="Löschen"
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showImport && (
        <MikrotikImportModal
          scenarios={scenarios}
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); loadScenarios(); }}
        />
      )}
      {editScenario !== undefined && (
        <EditScenarioModal
          scenario={editScenario}
          onClose={() => setEditScenario(undefined)}
          onSaved={() => { setEditScenario(undefined); loadScenarios(); }}
        />
      )}
    </div>
  );
}
