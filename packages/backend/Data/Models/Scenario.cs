using System.Text.Json.Serialization;

namespace NetworkAdminTool.Data.Models;

public class Scenario
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public bool IsActive { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonIgnore]
    public List<NetworkSwitch> Switches { get; set; } = new();
    [JsonIgnore]
    public List<Vlan> Vlans { get; set; } = new();
}
