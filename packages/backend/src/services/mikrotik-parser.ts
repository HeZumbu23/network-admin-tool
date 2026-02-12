/**
 * Mikrotik RSC Script Parser
 * Parses RouterOS export scripts (.rsc) and extracts network topology data.
 */

export interface ParsedVlan {
  vlanId: number;
  name: string;
  subnet?: string;
  gateway?: string;
  dhcpRange?: string;
  dhcpEnabled: boolean;
  description?: string;
}

export interface ParsedPort {
  portNumber: number;
  interfaceName: string;
  pvid: number;
  comment?: string;
  vlanMode: "access" | "trunk";
  trunkVlans: number[];
}

export interface ParsedDevice {
  name: string;
  deviceType: "router" | "switch";
  portCount: number;
  ports: ParsedPort[];
  vlans: ParsedVlan[];
}

export interface ParseResult {
  devices: ParsedDevice[];
  warnings: string[];
}

/** Parse key=value pairs from a RSC command line. Handles quoted values. */
function parseKV(line: string): Record<string, string> {
  const result: Record<string, string> = {};
  const regex = /([\w-]+)=(?:"([^"]*)"|([\S]*))/g;
  let match;
  while ((match = regex.exec(line)) !== null) {
    result[match[1]] = match[2] !== undefined ? match[2] : match[3];
  }
  return result;
}

/** Convert interface name like "ether3" to port number 3 */
function ifaceToPortNum(iface: string): number | null {
  const m = iface.match(/^ether(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

export function parseMikrotikScript(script: string): ParseResult {
  const warnings: string[] = [];

  // Normalize line endings and remove comment lines
  const lines = script
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim());

  let currentSection = "";

  // Collected raw data
  const deviceNames: string[] = [];
  const vlanInterfaces: Array<{ vlanId: number; name: string; comment?: string }> = [];
  const ipAddresses: Array<{ address: string; prefix: number; interface: string }> = [];
  const dhcpPools: Array<{ name: string; ranges: string }> = [];
  const bridgePorts: Array<{ iface: string; pvid: number; comment?: string }> = [];
  // Maps vlan-id -> { tagged: string[], untagged: string[] }
  const bridgeVlans: Map<number, { tagged: string[]; untagged: string[] }> = new Map();

  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;

    if (line.startsWith("/")) {
      currentSection = line;

      // Handle inline commands: /system identity set name="..."
      if (line.includes(" set ") || line.includes(" add ")) {
        const cmdPart = line.replace(/^\/[\w\s]+?(set|add)\s/, "");
        processCommand(currentSection.replace(/ (set|add).*$/, ""), line.includes(" add ") ? "add" : "set", cmdPart);
      }
      continue;
    }

    const cmdMatch = line.match(/^(add|set)\s+(.*)/);
    if (cmdMatch) {
      processCommand(currentSection, cmdMatch[1], cmdMatch[2]);
    }
  }

  function processCommand(section: string, _cmd: string, rest: string) {
    const kv = parseKV(rest);

    if (section.includes("/system identity")) {
      if (kv["name"]) deviceNames.push(kv["name"]);
    } else if (section.includes("/interface vlan")) {
      const vlanId = kv["vlan-id"] ? parseInt(kv["vlan-id"], 10) : null;
      if (vlanId !== null) {
        vlanInterfaces.push({
          vlanId,
          name: kv["name"] || `vlan${vlanId}`,
          comment: kv["comment"],
        });
      }
    } else if (section.includes("/ip address")) {
      if (kv["address"] && kv["interface"]) {
        const [addr, prefix] = kv["address"].split("/");
        ipAddresses.push({
          address: addr,
          prefix: parseInt(prefix || "24", 10),
          interface: kv["interface"],
        });
      }
    } else if (section.includes("/ip pool")) {
      if (kv["name"] && kv["ranges"]) {
        dhcpPools.push({ name: kv["name"], ranges: kv["ranges"] });
      }
    } else if (section.includes("/interface bridge port")) {
      if (kv["interface"] && kv["interface"].startsWith("ether")) {
        bridgePorts.push({
          iface: kv["interface"],
          pvid: kv["pvid"] ? parseInt(kv["pvid"], 10) : 1,
          comment: kv["comment"],
        });
      }
    } else if (section.includes("/interface bridge vlan")) {
      const vlanIdsStr = kv["vlan-ids"];
      if (!vlanIdsStr) return;

      // vlan-ids can be comma-separated or a single value
      const vlanIds = vlanIdsStr.split(",").map((v) => parseInt(v.trim(), 10));
      const taggedStr = kv["tagged"] || "";
      const untaggedStr = kv["untagged"] || "";

      const tagged = taggedStr ? taggedStr.split(",").map((s) => s.trim()).filter(Boolean) : [];
      const untagged = untaggedStr ? untaggedStr.split(",").map((s) => s.trim()).filter(Boolean) : [];

      for (const vId of vlanIds) {
        const existing = bridgeVlans.get(vId) || { tagged: [], untagged: [] };
        existing.tagged.push(...tagged);
        existing.untagged.push(...untagged);
        bridgeVlans.set(vId, existing);
      }
    }
  }

  // --- Determine device type ---
  // Router: has /interface vlan entries (VLAN sub-interfaces) + /ip address
  // Switch: has /interface bridge port with pvid assignments
  const isRouter = vlanInterfaces.length > 0;
  const isSwitch = bridgePorts.length > 0;

  const devices: ParsedDevice[] = [];

  if (isRouter) {
    // Build VLAN list from router script
    const parsedVlans: ParsedVlan[] = vlanInterfaces.map((vi) => {
      // Find matching IP address (interface name matches vlan interface name)
      const ip = ipAddresses.find((a) => a.interface === vi.name);
      // Find matching DHCP pool
      // Pool names are like pool-trusted matching vlan name vlan20-trusted
      const vlanShortName = vi.name.replace(/^vlan\d+-/, "");
      const pool = dhcpPools.find((p) => p.name.includes(vlanShortName) || p.name.includes(`pool-${vlanShortName}`));

      let subnet: string | undefined;
      let gateway: string | undefined;
      if (ip) {
        gateway = ip.address;
        // Build subnet from gateway and prefix: e.g. 10.20.0.1/24 -> 10.20.0.0/24
        const parts = ip.address.split(".");
        parts[3] = "0";
        subnet = `${parts.join(".")}/${ip.prefix}`;
      }

      return {
        vlanId: vi.vlanId,
        name: vi.comment || vi.name,
        subnet,
        gateway,
        dhcpRange: pool?.ranges,
        dhcpEnabled: !!pool,
        description: vi.comment,
      };
    });

    const deviceName = deviceNames[0] || "Mikrotik Router";

    // Router gets one uplink port to switch (ether2 is typically the trunk)
    const routerPorts: ParsedPort[] = [
      {
        portNumber: 1,
        interfaceName: "ether1",
        pvid: 1,
        comment: "WAN",
        vlanMode: "access",
        trunkVlans: [],
      },
      {
        portNumber: 2,
        interfaceName: "ether2",
        pvid: 1,
        comment: "Trunk zum Switch",
        vlanMode: "trunk",
        trunkVlans: parsedVlans.map((v) => v.vlanId),
      },
    ];

    devices.push({
      name: deviceName,
      deviceType: "router",
      portCount: 5, // hEX S has 5 ports
      ports: routerPorts,
      vlans: parsedVlans,
    });
  }

  if (isSwitch) {
    // Determine max port number
    const portNums = bridgePorts
      .map((p) => ifaceToPortNum(p.iface))
      .filter((n): n is number => n !== null);
    const maxPort = portNums.length > 0 ? Math.max(...portNums) : 8;

    // Build port list
    const portMap = new Map<number, ParsedPort>();

    for (const bp of bridgePorts) {
      const portNum = ifaceToPortNum(bp.iface);
      if (portNum === null) continue;

      // Determine vlan mode: check if this port appears as trunk (tagged in multiple vlans)
      let trunkVlans: number[] = [];
      let vlanMode: "access" | "trunk" = "access";

      for (const [vId, bv] of bridgeVlans.entries()) {
        const etherPorts = bv.tagged.filter((t) => t.startsWith("ether"));
        if (etherPorts.includes(bp.iface)) {
          trunkVlans.push(vId);
          vlanMode = "trunk";
        }
      }

      portMap.set(portNum, {
        portNumber: portNum,
        interfaceName: bp.iface,
        pvid: bp.pvid,
        comment: bp.comment,
        vlanMode,
        trunkVlans,
      });
    }

    // Fill remaining ports as empty access ports
    for (let i = 1; i <= maxPort; i++) {
      if (!portMap.has(i)) {
        portMap.set(i, {
          portNumber: i,
          interfaceName: `ether${i}`,
          pvid: 1,
          vlanMode: "access",
          trunkVlans: [],
        });
      }
    }

    const ports = Array.from(portMap.values()).sort((a, b) => a.portNumber - b.portNumber);
    const deviceName = deviceNames.find((n) => !devices.some((d) => d.name === n)) || deviceNames[0] || "Mikrotik Switch";

    devices.push({
      name: deviceName,
      deviceType: "switch",
      portCount: maxPort,
      ports,
      vlans: [],
    });
  }

  if (devices.length === 0) {
    warnings.push("Keine bekannten Konfigurationsabschnitte gefunden. Bitte prüfe das RSC-Format.");
  }

  return { devices, warnings };
}
