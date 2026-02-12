const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// --- Switches ---
export const api = {
  switches: {
    list: () => request<any[]>("/switches"),
    get: (id: number) => request<any>(`/switches/${id}`),
    create: (data: any) =>
      request<any>("/switches", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request<any>(`/switches/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<any>(`/switches/${id}`, { method: "DELETE" }),
    updatePort: (switchId: number, portNum: number, data: any) =>
      request<any>(`/switches/${switchId}/ports/${portNum}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  },

  vlans: {
    list: () => request<any[]>("/vlans"),
    create: (data: any) =>
      request<any>("/vlans", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request<any>(`/vlans/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<any>(`/vlans/${id}`, { method: "DELETE" }),
  },

  devices: {
    list: () => request<any[]>("/devices"),
    create: (data: any) =>
      request<any>("/devices", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request<any>(`/devices/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<any>(`/devices/${id}`, { method: "DELETE" }),
  },

  profiles: {
    list: () => request<any[]>("/profiles"),
    get: (id: number) => request<any>(`/profiles/${id}`),
    create: (data: any) =>
      request<any>("/profiles", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      request<any>(`/profiles/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<any>(`/profiles/${id}`, { method: "DELETE" }),
    toggle: (id: number) =>
      request<any>(`/profiles/${id}/toggle`, { method: "POST" }),
  },

  topology: {
    get: () => request<any>("/topology"),
    savePositions: (positions: any[]) =>
      request<any>("/topology/positions", {
        method: "PUT",
        body: JSON.stringify(positions),
      }),
    createConnection: (data: any) =>
      request<any>("/topology/connections", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    deleteConnection: (id: number) =>
      request<any>(`/topology/connections/${id}`, { method: "DELETE" }),
  },

  scenarios: {
    list: () => request<any[]>("/scenarios"),
    get: (id: number) => request<any>(`/scenarios/${id}`),
    create: (data: { name: string; description?: string }) =>
      request<any>("/scenarios", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: { name: string; description?: string }) =>
      request<any>(`/scenarios/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<any>(`/scenarios/${id}`, { method: "DELETE" }),
    activate: (id: number) =>
      request<any>(`/scenarios/${id}/activate`, { method: "POST" }),
    deactivateAll: () =>
      request<any>("/scenarios/deactivate-all", { method: "POST" }),
  },

  mikrotikImport: {
    preview: (script: string) =>
      request<any>("/mikrotik-import/preview", {
        method: "POST",
        body: JSON.stringify({ script }),
      }),
    import: (data: { script: string; scenarioId?: number; scenarioName?: string }) =>
      request<any>("/mikrotik-import/import", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },
};
