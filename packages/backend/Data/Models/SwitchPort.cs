using System.Text.Json.Serialization;

namespace NetworkAdminTool.Data.Models;

public class SwitchPort
{
    public int Id { get; set; }
    public int SwitchId { get; set; }
    public int PortNumber { get; set; }
    public string? Label { get; set; }
    public string VlanMode { get; set; } = "access"; // "access" | "trunk"
    public int Pvid { get; set; } = 1;
    public string TrunkVlans { get; set; } = "[]"; // JSON array string

    [JsonIgnore]
    public NetworkSwitch? Switch { get; set; }
}
