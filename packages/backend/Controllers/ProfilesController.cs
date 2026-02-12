using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetworkAdminTool.Data;
using NetworkAdminTool.Data.Models;

namespace NetworkAdminTool.Controllers;

[ApiController]
[Route("api/profiles")]
public class ProfilesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List() =>
        Ok(await db.AccessProfiles.Include(p => p.Rules).ToListAsync());

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var profile = await db.AccessProfiles.Include(p => p.Rules).FirstOrDefaultAsync(p => p.Id == id);
        if (profile == null) return NotFound(new { error = "Profile not found" });
        return Ok(profile);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ProfileRequest req)
    {
        var profile = new AccessProfile { Name = req.Name ?? "", DeviceId = req.DeviceId, IsActive = req.IsActive ?? true };
        foreach (var r in req.Rules ?? [])
            profile.Rules.Add(new ScheduleRule { DayType = r.DayType, StartTime = r.StartTime, EndTime = r.EndTime });
        db.AccessProfiles.Add(profile);
        await db.SaveChangesAsync();
        return Created($"/api/profiles/{profile.Id}", profile);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] ProfileRequest req)
    {
        var profile = await db.AccessProfiles.Include(p => p.Rules).FirstOrDefaultAsync(p => p.Id == id);
        if (profile == null) return NotFound(new { error = "Profile not found" });

        profile.Name = req.Name ?? profile.Name;
        profile.DeviceId = req.DeviceId;
        profile.IsActive = req.IsActive ?? profile.IsActive;

        db.ScheduleRules.RemoveRange(profile.Rules);
        profile.Rules.Clear();
        foreach (var r in req.Rules ?? [])
            profile.Rules.Add(new ScheduleRule { DayType = r.DayType, StartTime = r.StartTime, EndTime = r.EndTime });

        await db.SaveChangesAsync();
        return Ok(profile);
    }

    [HttpPost("{id:int}/toggle")]
    public async Task<IActionResult> Toggle(int id)
    {
        var profile = await db.AccessProfiles.FindAsync(id);
        if (profile == null) return NotFound(new { error = "Profile not found" });
        profile.IsActive = !profile.IsActive;
        await db.SaveChangesAsync();
        return Ok(profile);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var profile = await db.AccessProfiles.FindAsync(id);
        if (profile != null) { db.AccessProfiles.Remove(profile); await db.SaveChangesAsync(); }
        return Ok(new { success = true });
    }

    public record RuleRequest(string DayType, string StartTime, string EndTime);
    public record ProfileRequest(string? Name, int? DeviceId, bool? IsActive, List<RuleRequest>? Rules);
}
