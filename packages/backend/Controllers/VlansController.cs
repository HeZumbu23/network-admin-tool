using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetworkAdminTool.Data;
using NetworkAdminTool.Data.Models;

namespace NetworkAdminTool.Controllers;

[ApiController]
[Route("api/vlans")]
public class VlansController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List() =>
        Ok(await db.Vlans.ToListAsync());

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] VlanRequest req)
    {
        var vlan = new Vlan
        {
            VlanId = req.VlanId,
            Name = req.Name ?? "",
            Subnet = req.Subnet,
            Gateway = req.Gateway,
            DhcpEnabled = req.DhcpEnabled ?? false,
            DhcpRange = req.DhcpRange,
            Description = req.Description,
            ScenarioId = req.ScenarioId,
        };
        db.Vlans.Add(vlan);
        await db.SaveChangesAsync();
        return Created($"/api/vlans/{vlan.Id}", vlan);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] VlanRequest req)
    {
        var vlan = await db.Vlans.FindAsync(id);
        if (vlan == null) return NotFound(new { error = "VLAN not found" });

        vlan.VlanId = req.VlanId;
        vlan.Name = req.Name ?? vlan.Name;
        vlan.Subnet = req.Subnet;
        vlan.Gateway = req.Gateway;
        vlan.DhcpEnabled = req.DhcpEnabled ?? vlan.DhcpEnabled;
        vlan.DhcpRange = req.DhcpRange;
        vlan.Description = req.Description;
        await db.SaveChangesAsync();
        return Ok(vlan);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var vlan = await db.Vlans.FindAsync(id);
        if (vlan != null) { db.Vlans.Remove(vlan); await db.SaveChangesAsync(); }
        return Ok(new { success = true });
    }

    public record VlanRequest(int VlanId, string? Name, string? Subnet, string? Gateway, bool? DhcpEnabled, string? DhcpRange, string? Description, int? ScenarioId);
}
