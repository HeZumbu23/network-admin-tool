#===============================================================
# MikroTik hEX S (RB760iGS) – VLAN-Konfiguration
# Netzwerk: Joe's Heimnetz mit GL.iNet VPN-Enforcement
#===============================================================
# ACHTUNG: Dieses Script setzt eine RESET-Konfiguration voraus!
# Vor Ausführung: /system reset-configuration no-defaults=yes
#
# Anschluss:
#   ether1 = WAN (Internet-Router)
#   ether2 = Trunk zum MikroTik 24-Port Switch
#   ether3-5 = frei / optional
#===============================================================

#---------------------------------------------------------------
# 1. BRIDGE erstellen
#---------------------------------------------------------------
/interface bridge
add name=bridge1 vlan-filtering=no comment="Haupt-Bridge"

# Bridge-Ports (ether2 = Trunk zum 24-Port Switch)
/interface bridge port
add bridge=bridge1 interface=ether2

#---------------------------------------------------------------
# 2. VLAN-Interfaces auf der Bridge
#---------------------------------------------------------------
/interface vlan
add name=vlan10-mgmt       vlan-id=10 interface=bridge1 comment="Management"
add name=vlan20-trusted     vlan-id=20 interface=bridge1 comment="Trusted Devices"
add name=vlan21-kinder      vlan-id=21 interface=bridge1 comment="Kinder"
add name=vlan30-smarthome   vlan-id=30 interface=bridge1 comment="Smart Home / IoT"
add name=vlan40-media       vlan-id=40 interface=bridge1 comment="Media (Sonos)"
add name=vlan50-guest       vlan-id=50 interface=bridge1 comment="Gaeste"
add name=vlan60-cameras     vlan-id=60 interface=bridge1 comment="Kameras"
add name=vlan70-vpnremote   vlan-id=70 interface=bridge1 comment="VPN Remote Access"
add name=vlan80-energy      vlan-id=80 interface=bridge1 comment="Energy (Wallbox, WP)"
# VLAN 85: KEIN Interface auf hEX S – GL.iNet ist Gateway!
# VLAN 85 wird nur auf dem Switch als VLAN durchgereicht.
add name=vlan99-transit     vlan-id=99 interface=bridge1 comment="Transit GL.iNet WAN"

#---------------------------------------------------------------
# 3. Bridge VLAN-Tabelle (Tagged auf ether2 = Trunk)
#---------------------------------------------------------------
/interface bridge vlan
add bridge=bridge1 tagged=bridge1,ether2 vlan-ids=10
add bridge=bridge1 tagged=bridge1,ether2 vlan-ids=20
add bridge=bridge1 tagged=bridge1,ether2 vlan-ids=21
add bridge=bridge1 tagged=bridge1,ether2 vlan-ids=30
add bridge=bridge1 tagged=bridge1,ether2 vlan-ids=40
add bridge=bridge1 tagged=bridge1,ether2 vlan-ids=50
add bridge=bridge1 tagged=bridge1,ether2 vlan-ids=60
add bridge=bridge1 tagged=bridge1,ether2 vlan-ids=70
add bridge=bridge1 tagged=bridge1,ether2 vlan-ids=80
add bridge=bridge1 tagged=bridge1,ether2 vlan-ids=85
add bridge=bridge1 tagged=bridge1,ether2 vlan-ids=99

#---------------------------------------------------------------
# 4. IP-Adressen (hEX S = Gateway für jedes VLAN)
#---------------------------------------------------------------
/ip address
add address=10.10.0.1/24  interface=vlan10-mgmt       comment="Management Gateway"
add address=10.20.0.1/24  interface=vlan20-trusted     comment="Trusted Gateway"
add address=10.21.0.1/24  interface=vlan21-kinder      comment="Kinder Gateway"
add address=10.30.0.1/24  interface=vlan30-smarthome   comment="Smart Home Gateway"
add address=10.40.0.1/24  interface=vlan40-media       comment="Media Gateway"
add address=10.50.0.1/24  interface=vlan50-guest       comment="Guest Gateway"
add address=10.60.0.1/24  interface=vlan60-cameras     comment="Cameras Gateway"
add address=10.70.0.1/24  interface=vlan70-vpnremote   comment="VPN Remote Gateway"
add address=10.80.0.1/24  interface=vlan80-energy      comment="Energy Gateway"
# VLAN 85: KEINE IP – GL.iNet ist Gateway
add address=10.99.0.1/30  interface=vlan99-transit     comment="Transit Gateway"

#---------------------------------------------------------------
# 5. DHCP-Server pro VLAN
#---------------------------------------------------------------
/ip pool
add name=pool-mgmt      ranges=10.10.0.100-10.10.0.254
add name=pool-trusted    ranges=10.20.0.100-10.20.0.254
add name=pool-kinder     ranges=10.21.0.100-10.21.0.254
add name=pool-smarthome  ranges=10.30.0.100-10.30.0.254
add name=pool-media      ranges=10.40.0.100-10.40.0.254
add name=pool-guest      ranges=10.50.0.100-10.50.0.254
add name=pool-cameras    ranges=10.60.0.100-10.60.0.254
add name=pool-vpnremote  ranges=10.70.0.100-10.70.0.254
add name=pool-energy     ranges=10.80.0.100-10.80.0.254
# VLAN 85: DHCP macht der GL.iNet
# VLAN 99: Statisch (nur 2 Geräte), kein DHCP nötig

/ip dhcp-server network
add address=10.10.0.0/24  gateway=10.10.0.1  dns-server=10.10.0.1 comment="Management"
add address=10.20.0.0/24  gateway=10.20.0.1  dns-server=10.10.0.1 comment="Trusted"
add address=10.21.0.0/24  gateway=10.21.0.1  dns-server=10.10.0.1 comment="Kinder"
add address=10.30.0.0/24  gateway=10.30.0.1  dns-server=10.10.0.1 comment="Smart Home"
add address=10.40.0.0/24  gateway=10.40.0.1  dns-server=10.10.0.1 comment="Media"
add address=10.50.0.0/24  gateway=10.50.0.1  dns-server=10.10.0.1 comment="Guest"
add address=10.60.0.0/24  gateway=10.60.0.1  dns-server=10.10.0.1 comment="Cameras"
add address=10.70.0.0/24  gateway=10.70.0.1  dns-server=10.10.0.1 comment="VPN Remote"
add address=10.80.0.0/24  gateway=10.80.0.1  dns-server=10.10.0.1 comment="Energy"

/ip dhcp-server
add name=dhcp-mgmt      interface=vlan10-mgmt       address-pool=pool-mgmt      lease-time=1d disabled=no
add name=dhcp-trusted    interface=vlan20-trusted     address-pool=pool-trusted    lease-time=1d disabled=no
add name=dhcp-kinder     interface=vlan21-kinder      address-pool=pool-kinder     lease-time=1d disabled=no
add name=dhcp-smarthome  interface=vlan30-smarthome   address-pool=pool-smarthome  lease-time=1d disabled=no
add name=dhcp-media      interface=vlan40-media       address-pool=pool-media      lease-time=1d disabled=no
add name=dhcp-guest      interface=vlan50-guest       address-pool=pool-guest      lease-time=30m disabled=no
add name=dhcp-cameras    interface=vlan60-cameras     address-pool=pool-cameras    lease-time=1d disabled=no
add name=dhcp-vpnremote  interface=vlan70-vpnremote   address-pool=pool-vpnremote  lease-time=1h disabled=no
add name=dhcp-energy     interface=vlan80-energy      address-pool=pool-energy     lease-time=1d disabled=no

#---------------------------------------------------------------
# 6. DNS (lokal, weiterleitung an AdGuard / extern)
#---------------------------------------------------------------
/ip dns
set allow-remote-requests=yes servers=10.10.0.50
# 10.10.0.50 = AdGuard Home auf Raspberry Pi (VLAN 10)
# Fallback: servers=10.10.0.50,9.9.9.9 (Quad9)

#---------------------------------------------------------------
# 7. WAN / Internet (ether1 = DHCP-Client zum Internet-Router)
#---------------------------------------------------------------
/ip dhcp-client
add interface=ether1 disabled=no add-default-route=yes use-peer-dns=no comment="WAN"

/ip firewall nat
add chain=srcnat out-interface=ether1 action=masquerade comment="NAT WAN"

#---------------------------------------------------------------
# 8. FIREWALL – Interface-Listen
#---------------------------------------------------------------
/interface list
add name=WAN
add name=VLAN-ALL
add name=VLAN-TRUSTED
add name=VLAN-RESTRICTED

/interface list member
add interface=ether1              list=WAN
add interface=vlan10-mgmt         list=VLAN-ALL
add interface=vlan20-trusted      list=VLAN-ALL
add interface=vlan21-kinder       list=VLAN-ALL
add interface=vlan30-smarthome    list=VLAN-ALL
add interface=vlan40-media        list=VLAN-ALL
add interface=vlan50-guest        list=VLAN-ALL
add interface=vlan60-cameras      list=VLAN-ALL
add interface=vlan70-vpnremote    list=VLAN-ALL
add interface=vlan80-energy       list=VLAN-ALL
add interface=vlan99-transit      list=VLAN-ALL
add interface=vlan10-mgmt         list=VLAN-TRUSTED
add interface=vlan20-trusted      list=VLAN-TRUSTED

#---------------------------------------------------------------
# 9. FIREWALL – Filter Rules
#---------------------------------------------------------------
/ip firewall filter

#--- ALLGEMEIN ---
add chain=input   action=accept connection-state=established,related comment="Input: Established/Related"
add chain=forward action=accept connection-state=established,related comment="Forward: Established/Related"
add chain=input   action=drop   connection-state=invalid comment="Input: Drop Invalid"
add chain=forward action=drop   connection-state=invalid comment="Forward: Drop Invalid"

#--- INPUT: Wer darf auf den Router? ---
add chain=input action=accept in-interface-list=VLAN-TRUSTED comment="Input: Mgmt+Trusted -> Router"
add chain=input action=accept protocol=udp dst-port=67,68 comment="Input: DHCP erlauben"
add chain=input action=accept protocol=udp dst-port=53 comment="Input: DNS erlauben"
add chain=input action=accept protocol=tcp dst-port=53 comment="Input: DNS TCP erlauben"
add chain=input action=drop   in-interface-list=WAN comment="Input: Drop WAN"
add chain=input action=drop   comment="Input: Drop Rest"

#--- FORWARD: Inter-VLAN Routing ---

# VLAN 10 (Management) -> ueberall
add chain=forward action=accept in-interface=vlan10-mgmt comment="FW: Mgmt -> Alles"

# VLAN 20 (Trusted) -> darf auf 10, 30, 40, 60, 80, 85
add chain=forward action=accept in-interface=vlan20-trusted out-interface=vlan10-mgmt       comment="FW: Trusted -> Mgmt"
add chain=forward action=accept in-interface=vlan20-trusted out-interface=vlan30-smarthome   comment="FW: Trusted -> SmartHome"
add chain=forward action=accept in-interface=vlan20-trusted out-interface=vlan40-media       comment="FW: Trusted -> Media"
add chain=forward action=accept in-interface=vlan20-trusted out-interface=vlan60-cameras     comment="FW: Trusted -> Cameras"
add chain=forward action=accept in-interface=vlan20-trusted out-interface=vlan80-energy      comment="FW: Trusted -> Energy"

# VLAN 21 (Kinder) -> darf auf 40 (Sonos) + Internet
add chain=forward action=accept in-interface=vlan21-kinder out-interface=vlan40-media       comment="FW: Kinder -> Media (Sonos)"
add chain=forward action=accept in-interface=vlan21-kinder out-interface-list=WAN           comment="FW: Kinder -> Internet"

# VLAN 30 (Smart Home) -> Internet + VLAN 10 (Home Assistant Port 8123)
add chain=forward action=accept in-interface=vlan30-smarthome out-interface=vlan10-mgmt dst-address=10.10.0.0/24 protocol=tcp dst-port=8123 comment="FW: SmartHome -> HA 8123"
add chain=forward action=accept in-interface=vlan30-smarthome out-interface-list=WAN        comment="FW: SmartHome -> Internet"

# VLAN 40 (Media/Sonos) -> Internet + VLAN 10 (NAS fuer Musik)
add chain=forward action=accept in-interface=vlan40-media out-interface=vlan10-mgmt         comment="FW: Media -> Mgmt (NAS)"
add chain=forward action=accept in-interface=vlan40-media out-interface-list=WAN            comment="FW: Media -> Internet"

# VLAN 50 (Guest) -> NUR Internet
add chain=forward action=accept in-interface=vlan50-guest out-interface-list=WAN            comment="FW: Guest -> Internet"

# VLAN 60 (Cameras) -> NICHTS (komplett isoliert, kein Internet)
# Keine forward-Regel = kein Zugriff

# VLAN 70 (VPN Remote) -> 10, 60, 80
add chain=forward action=accept in-interface=vlan70-vpnremote out-interface=vlan10-mgmt     comment="FW: VPN -> Mgmt"
add chain=forward action=accept in-interface=vlan70-vpnremote out-interface=vlan60-cameras   comment="FW: VPN -> Cameras"
add chain=forward action=accept in-interface=vlan70-vpnremote out-interface=vlan80-energy    comment="FW: VPN -> Energy"

# VLAN 80 (Energy) -> Internet + VLAN 10 (Home Assistant)
add chain=forward action=accept in-interface=vlan80-energy out-interface=vlan10-mgmt dst-address=10.10.0.0/24 protocol=tcp dst-port=8123 comment="FW: Energy -> HA 8123"
add chain=forward action=accept in-interface=vlan80-energy out-interface-list=WAN           comment="FW: Energy -> Internet"

# VLAN 99 (Transit / GL.iNet) -> NUR Internet (fuer VPN-Tunnel)
add chain=forward action=accept in-interface=vlan99-transit out-interface-list=WAN          comment="FW: Transit -> Internet"

# VLAN 20 (Trusted) -> Internet
add chain=forward action=accept in-interface=vlan20-trusted out-interface-list=WAN          comment="FW: Trusted -> Internet"

#--- CATCH-ALL: Alles andere blocken ---
add chain=forward action=drop comment="FW: Drop alles andere (Inter-VLAN Block)"

#---------------------------------------------------------------
# 10. NAT fuer Transit-VLAN (GL.iNet braucht Internet)
#---------------------------------------------------------------
# Masquerade gilt bereits durch Regel in Abschnitt 7

#---------------------------------------------------------------
# 11. Bridge VLAN-Filtering AKTIVIEREN (zum Schluss!)
#---------------------------------------------------------------
# WICHTIG: Erst aktivieren wenn alles konfiguriert ist,
# sonst sperrt man sich aus!
/interface bridge set bridge1 vlan-filtering=yes

#---------------------------------------------------------------
# 12. Sicherheit: Router-Zugang absichern
#---------------------------------------------------------------
/user set [find name=admin] password="HIER_SICHERES_PASSWORT_SETZEN"
/ip service
set telnet disabled=yes
set ftp disabled=yes
set www disabled=no
set ssh disabled=no
set api disabled=yes
set winbox disabled=no
set api-ssl disabled=yes

#---------------------------------------------------------------
# 13. System
#---------------------------------------------------------------
/system identity set name="hEX-S-Router"
/system clock set time-zone-name=Europe/Berlin

#===============================================================
# FERTIG - hEX S Konfiguration
#===============================================================
# 
# NAECHSTE SCHRITTE:
# 
# 1. 24-Port Switch konfigurieren:
#    - Port 1 (Uplink hEX S): Trunk, alle VLANs tagged
#    - Port 2 (GL.iNet WAN):  Access, VLAN 99
#    - Port 3 (GL.iNet LAN):  Access, VLAN 85
#    - Port 10 (Wohnzimmer TV): Access, VLAN 85
#    - Port 11 (Wohnzimmer Formuler): Access, VLAN 85
#    - Port 12 (Wohnzimmer Sonos): Access, VLAN 40
#    - Port 15 (Gaestezimmer Formuler): Access, VLAN 85
#    - ... weitere Ports nach Bedarf
#
# 2. GL.iNet MT3000 konfigurieren:
#    - WAN: DHCP (bekommt IP von VLAN 99, 10.99.0.x)
#      Oder statisch: 10.99.0.2, Gateway 10.99.0.1
#    - LAN: 10.85.0.1/24 (eigenes Subnetz fuer VLAN 85)
#    - DHCP auf LAN aktivieren
#    - VPN-Client einrichten (WireGuard/OpenVPN)
#    - Kill-Switch aktivieren!
#
# 3. AdGuard Home auf Raspberry Pi:
#    - IP: 10.10.0.50 (statisch in VLAN 10)
#    - DNS upstream: 9.9.9.9 / 1.1.1.1
#    - Kinderschutz-Filter fuer VLAN 21
#
# 4. Sonos mDNS:
#    - Falls Sonos-Steuerung von VLAN 20/21 aus noetig:
#      /ip proxy (oder igmp-proxy / mDNS Repeater Paket)
#
#===============================================================
