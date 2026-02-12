using System.Text.Json.Serialization;

namespace NetworkAdminTool.Data.Models;

public class Connection
{
    public int Id { get; set; }
    public int FromSwitchId { get; set; }
    public int FromPort { get; set; }
    public int ToSwitchId { get; set; }
    public int ToPort { get; set; }
    public string LinkType { get; set; } = "trunk"; // "trunk" | "access"

    [JsonIgnore]
    public NetworkSwitch? FromSwitch { get; set; }
    [JsonIgnore]
    public NetworkSwitch? ToSwitch { get; set; }
}
