using System.Text.RegularExpressions;

namespace NetworkAdminTool.Services;

public record ParsedVlan(int VlanId, string Name, string? Subnet, string? Gateway, string? DhcpRange, bool DhcpEnabled, string? Description);
public record ParsedPort(int PortNumber, string InterfaceName, int Pvid, string? Comment, string VlanMode, List<int> TrunkVlans);
public record ParsedDevice(string Name, string DeviceType, int PortCount, List<ParsedPort> Ports, List<ParsedVlan> Vlans);
public record ParseResult(List<ParsedDevice> Devices, List<string> Warnings);

public class MikrotikParserService
{
    private static readonly Regex KvRegex = new(@"([\w-]+)=(?:""([^""]*)""|(\S*))", RegexOptions.Compiled);

    private static Dictionary<string, string> ParseKV(string line)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (Match m in KvRegex.Matches(line))
            result[m.Groups[1].Value] = m.Groups[2].Success ? m.Groups[2].Value : m.Groups[3].Value;
        return result;
    }

    private static int? IfaceToPortNum(string iface)
    {
        var m = Regex.Match(iface, @"^ether(\d+)$");
        return m.Success ? int.Parse(m.Groups[1].Value) : null;
    }

    public ParseResult ParseScript(string script)
    {
        var warnings = new List<string>();
        var lines = script.Replace("\r\n", "\n").Split('\n').Select(l => l.Trim());

        var currentSection = "";

        // Collected raw data
        var deviceNames = new List<string>();
        var vlanInterfaces = new List<(int VlanId, string Name, string? Comment)>();
        var ipAddresses = new List<(string Address, int Prefix, string Interface)>();
        var dhcpPools = new List<(string Name, string Ranges)>();
        var bridgePorts = new List<(string Iface, int Pvid, string? Comment)>();
        var bridgeVlans = new Dictionary<int, (List<string> Tagged, List<string> Untagged)>();

        void ProcessCommand(string section, string rest)
        {
            var kv = ParseKV(rest);

            if (section.Contains("/system identity"))
            {
                if (kv.TryGetValue("name", out var name)) deviceNames.Add(name);
            }
            else if (section.Contains("/interface vlan"))
            {
                if (kv.TryGetValue("vlan-id", out var vidStr) && int.TryParse(vidStr, out var vid))
                    vlanInterfaces.Add((vid, kv.GetValueOrDefault("name", $"vlan{vid}"), kv.GetValueOrDefault("comment")));
            }
            else if (section.Contains("/ip address"))
            {
                if (kv.TryGetValue("address", out var addr) && kv.TryGetValue("interface", out var iface))
                {
                    var parts = addr.Split('/');
                    ipAddresses.Add((parts[0], parts.Length > 1 && int.TryParse(parts[1], out var p) ? p : 24, iface));
                }
            }
            else if (section.Contains("/ip pool"))
            {
                if (kv.TryGetValue("name", out var poolName) && kv.TryGetValue("ranges", out var ranges))
                    dhcpPools.Add((poolName, ranges));
            }
            else if (section.Contains("/interface bridge port"))
            {
                if (kv.TryGetValue("interface", out var iface) && iface.StartsWith("ether"))
                {
                    int.TryParse(kv.GetValueOrDefault("pvid", "1"), out var pvid);
                    bridgePorts.Add((iface, pvid, kv.GetValueOrDefault("comment")));
                }
            }
            else if (section.Contains("/interface bridge vlan"))
            {
                if (!kv.TryGetValue("vlan-ids", out var vidsStr)) return;
                var vids = vidsStr.Split(',').Select(v => int.TryParse(v.Trim(), out var n) ? n : -1).Where(n => n > 0);
                var tagged = kv.GetValueOrDefault("tagged", "").Split(',').Select(s => s.Trim()).Where(s => s.Length > 0).ToList();
                var untagged = kv.GetValueOrDefault("untagged", "").Split(',').Select(s => s.Trim()).Where(s => s.Length > 0).ToList();

                foreach (var vid in vids)
                {
                    if (!bridgeVlans.ContainsKey(vid)) bridgeVlans[vid] = (new(), new());
                    bridgeVlans[vid].Tagged.AddRange(tagged);
                    bridgeVlans[vid].Untagged.AddRange(untagged);
                }
            }
        }

        foreach (var line in lines)
        {
            if (string.IsNullOrEmpty(line) || line.StartsWith('#')) continue;

            if (line.StartsWith('/'))
            {
                currentSection = line;
                // Handle inline: /system identity set name="..."
                var inlineMatch = Regex.Match(line, @"^(/[\w\s/]+?)\s+(set|add)\s+(.+)");
                if (inlineMatch.Success)
                {
                    currentSection = inlineMatch.Groups[1].Value;
                    ProcessCommand(currentSection, inlineMatch.Groups[3].Value);
                }
                continue;
            }

            var cmdMatch = Regex.Match(line, @"^(add|set)\s+(.*)");
            if (cmdMatch.Success) ProcessCommand(currentSection, cmdMatch.Groups[2].Value);
        }

        bool isRouter = vlanInterfaces.Count > 0;
        bool isSwitch = bridgePorts.Count > 0;
        var devices = new List<ParsedDevice>();

        if (isRouter)
        {
            var parsedVlans = vlanInterfaces.Select(vi =>
            {
                var ip = ipAddresses.FirstOrDefault(a => a.Interface == vi.Name);
                var shortName = Regex.Replace(vi.Name, @"^vlan\d+-", "");
                var pool = dhcpPools.FirstOrDefault(p => p.Name.Contains(shortName));

                string? subnet = null, gateway = null;
                if (ip != default)
                {
                    gateway = ip.Address;
                    var parts = ip.Address.Split('.');
                    parts[3] = "0";
                    subnet = $"{string.Join('.', parts)}/{ip.Prefix}";
                }

                return new ParsedVlan(vi.VlanId, vi.Comment ?? vi.Name, subnet, gateway, pool == default ? null : pool.Ranges, pool != default, vi.Comment);
            }).ToList();

            var routerVlanIds = parsedVlans.Select(v => v.VlanId).ToList();
            var routerPorts = new List<ParsedPort>
            {
                new(1, "ether1", 1, "WAN", "access", new()),
                new(2, "ether2", 1, "Trunk zum Switch", "trunk", routerVlanIds),
            };

            devices.Add(new ParsedDevice(deviceNames.FirstOrDefault() ?? "Mikrotik Router", "router", 5, routerPorts, parsedVlans));
        }

        if (isSwitch)
        {
            var portNums = bridgePorts.Select(p => IfaceToPortNum(p.Iface)).Where(n => n.HasValue).Select(n => n!.Value).ToList();
            var maxPort = portNums.Count > 0 ? portNums.Max() : 8;

            var portMap = new Dictionary<int, ParsedPort>();
            foreach (var bp in bridgePorts)
            {
                var portNum = IfaceToPortNum(bp.Iface);
                if (!portNum.HasValue) continue;

                var trunkVlans = new List<int>();
                var vlanMode = "access";
                foreach (var (vid, bv) in bridgeVlans)
                {
                    if (bv.Tagged.Contains(bp.Iface) && bp.Iface.StartsWith("ether"))
                    {
                        trunkVlans.Add(vid);
                        vlanMode = "trunk";
                    }
                }

                portMap[portNum.Value] = new ParsedPort(portNum.Value, bp.Iface, bp.Pvid, bp.Comment, vlanMode, trunkVlans);
            }

            for (int i = 1; i <= maxPort; i++)
                if (!portMap.ContainsKey(i))
                    portMap[i] = new ParsedPort(i, $"ether{i}", 1, null, "access", new());

            var ports = portMap.Values.OrderBy(p => p.PortNumber).ToList();
            var switchName = deviceNames.FirstOrDefault(n => !devices.Any(d => d.Name == n)) ?? deviceNames.FirstOrDefault() ?? "Mikrotik Switch";

            devices.Add(new ParsedDevice(switchName, "switch", maxPort, ports, new()));
        }

        if (devices.Count == 0)
            warnings.Add("Keine bekannten Konfigurationsabschnitte gefunden. Bitte prüfe das RSC-Format.");

        return new ParseResult(devices, warnings);
    }
}
