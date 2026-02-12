using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetworkAdminTool.Data;
using NetworkAdminTool.Data.Models;

namespace NetworkAdminTool.Controllers;

[ApiController]
[Route("api/switches")]
public class SwitchesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List() =>
        Ok(await db.Switches.ToListAsync());

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var sw = await db.Switches.FindAsync(id);
        if (sw == null) return NotFound(new { error = "Switch not found" });
        var ports = await db.SwitchPorts.Where(p => p.SwitchId == id).OrderBy(p => p.PortNumber).ToListAsync();
        return Ok(new { sw.Id, sw.ScenarioId, sw.Name, sw.Model, sw.IpAddress, sw.PortCount, sw.IsManaged, sw.Location, sw.PosX, sw.PosY, sw.CreatedAt, ports });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SwitchRequest req)
    {
        var sw = new NetworkSwitch
        {
            Name = req.Name ?? "",
            Model = req.Model,
            IpAddress = req.IpAddress,
            PortCount = req.PortCount ?? 8,
            IsManaged = req.IsManaged ?? false,
            Location = req.Location,
            ScenarioId = req.ScenarioId,
        };
        db.Switches.Add(sw);
        await db.SaveChangesAsync();

        for (int i = 1; i <= sw.PortCount; i++)
            db.SwitchPorts.Add(new SwitchPort { SwitchId = sw.Id, PortNumber = i });
        await db.SaveChangesAsync();

        return Created($"/api/switches/{sw.Id}", sw);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] SwitchRequest req)
    {
        var sw = await db.Switches.FindAsync(id);
        if (sw == null) return NotFound(new { error = "Switch not found" });

        sw.Name = req.Name ?? sw.Name;
        sw.Model = req.Model;
        sw.IpAddress = req.IpAddress;
        sw.PortCount = req.PortCount ?? sw.PortCount;
        sw.IsManaged = req.IsManaged ?? sw.IsManaged;
        sw.Location = req.Location;
        await db.SaveChangesAsync();
        return Ok(sw);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var sw = await db.Switches.FindAsync(id);
        if (sw != null) { db.Switches.Remove(sw); await db.SaveChangesAsync(); }
        return Ok(new { success = true });
    }

    [HttpPut("{id:int}/ports/{portNum:int}")]
    public async Task<IActionResult> UpdatePort(int id, int portNum, [FromBody] PortRequest req)
    {
        var port = await db.SwitchPorts.FirstOrDefaultAsync(p => p.SwitchId == id && p.PortNumber == portNum);
        if (port == null) return NotFound(new { error = "Port not found" });

        port.Label = req.Label;
        port.VlanMode = req.VlanMode ?? port.VlanMode;
        port.Pvid = req.Pvid ?? port.Pvid;
        if (req.TrunkVlans != null)
            port.TrunkVlans = System.Text.Json.JsonSerializer.Serialize(req.TrunkVlans);
        await db.SaveChangesAsync();
        return Ok(port);
    }

    public record SwitchRequest(string? Name, string? Model, string? IpAddress, int? PortCount, bool? IsManaged, string? Location, int? ScenarioId);
    public record PortRequest(string? Label, string? VlanMode, int? Pvid, int[]? TrunkVlans);
}
