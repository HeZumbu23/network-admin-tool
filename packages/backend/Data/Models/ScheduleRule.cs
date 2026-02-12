using System.Text.Json.Serialization;

namespace NetworkAdminTool.Data.Models;

public class ScheduleRule
{
    public int Id { get; set; }
    public int ProfileId { get; set; }
    public string DayType { get; set; } = ""; // "weekday", "weekend", "monday", etc.
    public string StartTime { get; set; } = ""; // HH:MM
    public string EndTime { get; set; } = "";   // HH:MM

    [JsonIgnore]
    public AccessProfile? Profile { get; set; }
}
