using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetworkAdminTool.Data;
using NetworkAdminTool.Data.Models;
using NetworkAdminTool.Services;

namespace NetworkAdminTool.Controllers;

[ApiController]
[Route("api/mikrotik-import")]
public class MikrotikImportController(AppDbContext db, MikrotikParserService parser) : ControllerBase
{
    [HttpPost("preview")]
    public IActionResult Preview([FromBody] ImportRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Script))
            return BadRequest(new { error = "script is required" });

        return Ok(parser.ParseScript(req.Script));
    }

    [HttpPost("import")]
    public async Task<IActionResult> Import([FromBody] ImportRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Script))
            return BadRequest(new { error = "script is required" });

        var parsed = parser.ParseScript(req.Script);
        if (parsed.Devices.Count == 0)
            return BadRequest(new { error = "Keine Geräte im Script gefunden.", warnings = parsed.Warnings });

        int scenarioId;

        if (req.ScenarioId.HasValue)
        {
            var existing = await db.Scenarios.FindAsync(req.ScenarioId.Value);
            if (existing == null) return NotFound(new { error = "Scenario not found" });
            scenarioId = existing.Id;
        }
        else
        {
            var name = req.ScenarioName ?? parsed.Devices[0].Name;
            var scenario = new Scenario { Name = name, Description = "Importiert aus Mikrotik RSC" };
            db.Scenarios.Add(scenario);
            await db.SaveChangesAsync();
            scenarioId = scenario.Id;
        }

        var importedVlans = 0;
        var importedSwitches = 0;

        foreach (var device in parsed.Devices)
        {
            foreach (var pv in device.Vlans)
            {
                var existing = await db.Vlans.FirstOrDefaultAsync(v => v.ScenarioId == scenarioId && v.VlanId == pv.VlanId);
                if (existing == null)
                {
                    db.Vlans.Add(new Vlan
                    {
                        ScenarioId = scenarioId, VlanId = pv.VlanId, Name = pv.Name,
                        Subnet = pv.Subnet, Gateway = pv.Gateway,
                        DhcpEnabled = pv.DhcpEnabled, DhcpRange = pv.DhcpRange, Description = pv.Description,
                    });
                    importedVlans++;
                }
                else
                {
                    existing.Name = pv.Name; existing.Subnet = pv.Subnet; existing.Gateway = pv.Gateway;
                    existing.DhcpEnabled = pv.DhcpEnabled; existing.DhcpRange = pv.DhcpRange;
                }
            }
        }
        await db.SaveChangesAsync();

        foreach (var (device, i) in parsed.Devices.Select((d, i) => (d, i)))
        {
            var sw = new NetworkSwitch
            {
                ScenarioId = scenarioId, Name = device.Name,
                Model = device.DeviceType == "router" ? "Mikrotik Router" : "Mikrotik Switch",
                PortCount = device.PortCount, IsManaged = true,
                PosX = i * 300, PosY = 100,
            };
            db.Switches.Add(sw);
            await db.SaveChangesAsync();

            var configuredPorts = new HashSet<int>(device.Ports.Select(p => p.PortNumber));
            foreach (var port in device.Ports)
            {
                db.SwitchPorts.Add(new SwitchPort
                {
                    SwitchId = sw.Id, PortNumber = port.PortNumber,
                    Label = port.Comment ?? port.InterfaceName,
                    VlanMode = port.VlanMode, Pvid = port.Pvid,
                    TrunkVlans = System.Text.Json.JsonSerializer.Serialize(port.TrunkVlans),
                });
            }
            for (int p = 1; p <= device.PortCount; p++)
                if (!configuredPorts.Contains(p))
                    db.SwitchPorts.Add(new SwitchPort { SwitchId = sw.Id, PortNumber = p, Label = $"ether{p}", TrunkVlans = "[]" });

            await db.SaveChangesAsync();
            importedSwitches++;
        }

        return Created("", new
        {
            scenarioId,
            importedSwitches,
            importedVlans,
            warnings = parsed.Warnings,
            devices = parsed.Devices.Select(d => new { d.Name, d.DeviceType, d.PortCount }),
        });
    }

    public record ImportRequest(string? Script, int? ScenarioId, string? ScenarioName);
}
