using System.Text.Json.Serialization;

namespace NetworkAdminTool.Data.Models;

public class NetworkSwitch
{
    public int Id { get; set; }
    public int? ScenarioId { get; set; }
    public string Name { get; set; } = "";
    public string? Model { get; set; }
    public string? IpAddress { get; set; }
    public int PortCount { get; set; } = 8;
    public bool IsManaged { get; set; } = false;
    public string? Location { get; set; }
    public double PosX { get; set; } = 0;
    public double PosY { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonIgnore]
    public Scenario? Scenario { get; set; }
    [JsonIgnore]
    public List<SwitchPort> Ports { get; set; } = new();
}
