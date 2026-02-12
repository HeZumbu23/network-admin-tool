using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetworkAdminTool.Data;
using NetworkAdminTool.Data.Models;

namespace NetworkAdminTool.Controllers;

[ApiController]
[Route("api/topology")]
public class TopologyController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var switches = await db.Switches.ToListAsync();
        var connections = await db.Connections.ToListAsync();
        return Ok(new { switches, connections });
    }

    [HttpPut("positions")]
    public async Task<IActionResult> SavePositions([FromBody] List<PositionRequest> positions)
    {
        foreach (var pos in positions)
        {
            var sw = await db.Switches.FindAsync(pos.Id);
            if (sw != null) { sw.PosX = pos.PosX; sw.PosY = pos.PosY; }
        }
        await db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpPost("connections")]
    public async Task<IActionResult> CreateConnection([FromBody] ConnectionRequest req)
    {
        var conn = new Connection
        {
            FromSwitchId = req.FromSwitchId,
            FromPort = req.FromPort,
            ToSwitchId = req.ToSwitchId,
            ToPort = req.ToPort,
            LinkType = req.LinkType ?? "trunk",
        };
        db.Connections.Add(conn);
        await db.SaveChangesAsync();
        return Created($"/api/topology/connections/{conn.Id}", conn);
    }

    [HttpDelete("connections/{id:int}")]
    public async Task<IActionResult> DeleteConnection(int id)
    {
        var conn = await db.Connections.FindAsync(id);
        if (conn != null) { db.Connections.Remove(conn); await db.SaveChangesAsync(); }
        return Ok(new { success = true });
    }

    public record PositionRequest(int Id, double PosX, double PosY);
    public record ConnectionRequest(int FromSwitchId, int FromPort, int ToSwitchId, int ToPort, string? LinkType);
}
