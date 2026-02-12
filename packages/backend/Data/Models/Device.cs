using System.Text.Json.Serialization;

namespace NetworkAdminTool.Data.Models;

public class Device
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string MacAddress { get; set; } = "";
    public string? IpAddress { get; set; }
    public int? VlanId { get; set; }
    public int? SwitchId { get; set; }
    public int? PortNumber { get; set; }
    public string DeviceType { get; set; } = "other";
    public bool IsOnline { get; set; } = false;

    [JsonIgnore]
    public Vlan? Vlan { get; set; }
    [JsonIgnore]
    public NetworkSwitch? Switch { get; set; }
}
