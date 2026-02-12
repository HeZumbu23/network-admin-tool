using System.Text.Json.Serialization;

namespace NetworkAdminTool.Data.Models;

public class Vlan
{
    public int Id { get; set; }
    public int? ScenarioId { get; set; }
    public int VlanId { get; set; }   // VLAN number (e.g. 20, 40)
    public string Name { get; set; } = "";
    public string? Subnet { get; set; }
    public string? Gateway { get; set; }
    public bool DhcpEnabled { get; set; } = false;
    public string? DhcpRange { get; set; }
    public string? Description { get; set; }

    [JsonIgnore]
    public Scenario? Scenario { get; set; }
}
