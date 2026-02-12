using Microsoft.EntityFrameworkCore;
using NetworkAdminTool.Data.Models;

namespace NetworkAdminTool.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Scenario> Scenarios => Set<Scenario>();
    public DbSet<NetworkSwitch> Switches => Set<NetworkSwitch>();
    public DbSet<SwitchPort> SwitchPorts => Set<SwitchPort>();
    public DbSet<Vlan> Vlans => Set<Vlan>();
    public DbSet<Device> Devices => Set<Device>();
    public DbSet<AccessProfile> AccessProfiles => Set<AccessProfile>();
    public DbSet<ScheduleRule> ScheduleRules => Set<ScheduleRule>();
    public DbSet<Connection> Connections => Set<Connection>();

    protected override void OnModelCreating(ModelBuilder m)
    {
        // Scenario -> Switches (cascade delete)
        m.Entity<NetworkSwitch>()
            .HasOne(s => s.Scenario)
            .WithMany(sc => sc.Switches)
            .HasForeignKey(s => s.ScenarioId)
            .OnDelete(DeleteBehavior.Cascade);

        // Scenario -> Vlans (cascade delete)
        m.Entity<Vlan>()
            .HasOne(v => v.Scenario)
            .WithMany(sc => sc.Vlans)
            .HasForeignKey(v => v.ScenarioId)
            .OnDelete(DeleteBehavior.Cascade);

        // Switch -> Ports (cascade delete)
        m.Entity<SwitchPort>()
            .HasOne(p => p.Switch)
            .WithMany(s => s.Ports)
            .HasForeignKey(p => p.SwitchId)
            .OnDelete(DeleteBehavior.Cascade);

        // Switch -> Connections (cascade delete from both sides)
        m.Entity<Connection>()
            .HasOne(c => c.FromSwitch)
            .WithMany()
            .HasForeignKey(c => c.FromSwitchId)
            .OnDelete(DeleteBehavior.Cascade);

        m.Entity<Connection>()
            .HasOne(c => c.ToSwitch)
            .WithMany()
            .HasForeignKey(c => c.ToSwitchId)
            .OnDelete(DeleteBehavior.Restrict); // Restrict to avoid multiple cascade paths

        // Device -> Vlan (set null on delete)
        m.Entity<Device>()
            .HasOne(d => d.Vlan)
            .WithMany()
            .HasForeignKey(d => d.VlanId)
            .OnDelete(DeleteBehavior.SetNull);

        // Device -> Switch (set null on delete)
        m.Entity<Device>()
            .HasOne(d => d.Switch)
            .WithMany()
            .HasForeignKey(d => d.SwitchId)
            .OnDelete(DeleteBehavior.SetNull);

        // AccessProfile -> Device (cascade)
        m.Entity<AccessProfile>()
            .HasOne(p => p.Device)
            .WithMany()
            .HasForeignKey(p => p.DeviceId)
            .OnDelete(DeleteBehavior.Cascade);

        // ScheduleRule -> AccessProfile (cascade)
        m.Entity<ScheduleRule>()
            .HasOne(r => r.Profile)
            .WithMany(p => p.Rules)
            .HasForeignKey(r => r.ProfileId)
            .OnDelete(DeleteBehavior.Cascade);

        // Unique constraint: MAC address
        m.Entity<Device>().HasIndex(d => d.MacAddress).IsUnique();
    }
}
