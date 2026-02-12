using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetworkAdminTool.Data;
using NetworkAdminTool.Data.Models;

namespace NetworkAdminTool.Controllers;

[ApiController]
[Route("api/devices")]
public class DevicesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var result = await db.Devices
            .Select(d => new
            {
                d.Id, d.Name, d.MacAddress, d.IpAddress,
                d.VlanId,
                VlanName = d.Vlan != null ? d.Vlan.Name : null,
                d.SwitchId,
                SwitchName = d.Switch != null ? d.Switch.Name : null,
                d.PortNumber, d.DeviceType, d.IsOnline
            })
            .ToListAsync();
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] DeviceRequest req)
    {
        var device = new Device
        {
            Name = req.Name ?? "",
            MacAddress = req.MacAddress ?? "",
            IpAddress = req.IpAddress,
            VlanId = req.VlanId,
            SwitchId = req.SwitchId,
            PortNumber = req.PortNumber,
            DeviceType = req.DeviceType ?? "other",
        };
        db.Devices.Add(device);
        await db.SaveChangesAsync();
        return Created($"/api/devices/{device.Id}", device);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] DeviceRequest req)
    {
        var device = await db.Devices.FindAsync(id);
        if (device == null) return NotFound(new { error = "Device not found" });

        device.Name = req.Name ?? device.Name;
        device.MacAddress = req.MacAddress ?? device.MacAddress;
        device.IpAddress = req.IpAddress;
        device.VlanId = req.VlanId;
        device.SwitchId = req.SwitchId;
        device.PortNumber = req.PortNumber;
        device.DeviceType = req.DeviceType ?? device.DeviceType;
        device.IsOnline = req.IsOnline ?? device.IsOnline;
        await db.SaveChangesAsync();
        return Ok(device);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var device = await db.Devices.FindAsync(id);
        if (device != null) { db.Devices.Remove(device); await db.SaveChangesAsync(); }
        return Ok(new { success = true });
    }

    public record DeviceRequest(string? Name, string? MacAddress, string? IpAddress, int? VlanId, int? SwitchId, int? PortNumber, string? DeviceType, bool? IsOnline);
}
