using System.Text.Json.Serialization;

namespace NetworkAdminTool.Data.Models;

public class AccessProfile
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public int? DeviceId { get; set; }
    public bool IsActive { get; set; } = true;

    [JsonIgnore]
    public Device? Device { get; set; }
    public List<ScheduleRule> Rules { get; set; } = new();
}
