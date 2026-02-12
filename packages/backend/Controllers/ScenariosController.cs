using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetworkAdminTool.Data;
using NetworkAdminTool.Data.Models;

namespace NetworkAdminTool.Controllers;

[ApiController]
[Route("api/scenarios")]
public class ScenariosController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var all = await db.Scenarios.ToListAsync();
        var result = await Task.WhenAll(all.Select(async s => new
        {
            s.Id, s.Name, s.Description, s.IsActive, s.CreatedAt,
            SwitchCount = await db.Switches.CountAsync(sw => sw.ScenarioId == s.Id),
            VlanCount = await db.Vlans.CountAsync(v => v.ScenarioId == s.Id),
        }));
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var s = await db.Scenarios.FindAsync(id);
        if (s == null) return NotFound(new { error = "Scenario not found" });
        return Ok(s);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ScenarioRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { error = "Name is required" });

        var s = new Scenario { Name = req.Name, Description = req.Description };
        db.Scenarios.Add(s);
        await db.SaveChangesAsync();
        return Created($"/api/scenarios/{s.Id}", s);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] ScenarioRequest req)
    {
        var s = await db.Scenarios.FindAsync(id);
        if (s == null) return NotFound(new { error = "Scenario not found" });
        s.Name = req.Name ?? s.Name;
        s.Description = req.Description;
        await db.SaveChangesAsync();
        return Ok(s);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var s = await db.Scenarios.FindAsync(id);
        if (s != null) { db.Scenarios.Remove(s); await db.SaveChangesAsync(); }
        return Ok(new { success = true });
    }

    [HttpPost("{id:int}/activate")]
    public async Task<IActionResult> Activate(int id)
    {
        var s = await db.Scenarios.FindAsync(id);
        if (s == null) return NotFound(new { error = "Scenario not found" });

        await db.Scenarios.ExecuteUpdateAsync(x => x.SetProperty(sc => sc.IsActive, false));
        s.IsActive = true;
        await db.SaveChangesAsync();
        return Ok(s);
    }

    [HttpPost("deactivate-all")]
    public async Task<IActionResult> DeactivateAll()
    {
        await db.Scenarios.ExecuteUpdateAsync(x => x.SetProperty(sc => sc.IsActive, false));
        return Ok(new { success = true });
    }

    public record ScenarioRequest(string? Name, string? Description);
}
