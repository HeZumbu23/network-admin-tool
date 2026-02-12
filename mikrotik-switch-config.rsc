#===============================================================
# MikroTik 24-Port Switch – VLAN Port-Zuweisung
# Passend zum hEX S Router-Script
#===============================================================
# Dieses Script ist fuer einen MikroTik CRS3xx oder CSS3xx
# mit SwOS oder RouterOS im Switch-Modus.
#
# Bei RouterOS-basierten Switches (CRS3xx):
#===============================================================

#---------------------------------------------------------------
# 1. BRIDGE erstellen
#---------------------------------------------------------------
/interface bridge
add name=bridge1 vlan-filtering=no comment="Switch Bridge"

#---------------------------------------------------------------
# 2. ALLE Ports zur Bridge hinzufuegen
#---------------------------------------------------------------
/interface bridge port
add bridge=bridge1 interface=ether1  pvid=1  comment="Uplink hEX S (Trunk)"
add bridge=bridge1 interface=ether2  pvid=99 comment="GL.iNet WAN (Transit)"
add bridge=bridge1 interface=ether3  pvid=85 comment="GL.iNet LAN (VPN Devices)"
add bridge=bridge1 interface=ether4  pvid=1  comment="-- frei --"
add bridge=bridge1 interface=ether5  pvid=1  comment="-- frei --"
add bridge=bridge1 interface=ether6  pvid=1  comment="-- frei --"
add bridge=bridge1 interface=ether7  pvid=1  comment="-- frei --"
add bridge=bridge1 interface=ether8  pvid=1  comment="-- frei --"
add bridge=bridge1 interface=ether9  pvid=1  comment="-- frei --"
# --- Wohnzimmer ---
add bridge=bridge1 interface=ether10 pvid=85 comment="Wohnzimmer - TV (VPN)"
add bridge=bridge1 interface=ether11 pvid=85 comment="Wohnzimmer - Formuler (VPN)"
add bridge=bridge1 interface=ether12 pvid=40 comment="Wohnzimmer - Sonos"
add bridge=bridge1 interface=ether13 pvid=20 comment="Wohnzimmer - Trusted (Reserve)"
add bridge=bridge1 interface=ether14 pvid=1  comment="-- frei --"
# --- Gaestezimmer ---
add bridge=bridge1 interface=ether15 pvid=85 comment="Gaestezimmer - Formuler (VPN)"
add bridge=bridge1 interface=ether16 pvid=50 comment="Gaestezimmer - Guest (Reserve)"
add bridge=bridge1 interface=ether17 pvid=1  comment="-- frei --"
add bridge=bridge1 interface=ether18 pvid=1  comment="-- frei --"
# --- Weitere Raeume ---
add bridge=bridge1 interface=ether19 pvid=1  comment="-- frei --"
add bridge=bridge1 interface=ether20 pvid=1  comment="-- frei --"
add bridge=bridge1 interface=ether21 pvid=1  comment="-- frei --"
add bridge=bridge1 interface=ether22 pvid=1  comment="-- frei --"
add bridge=bridge1 interface=ether23 pvid=1  comment="-- frei --"
add bridge=bridge1 interface=ether24 pvid=1  comment="-- frei --"

#---------------------------------------------------------------
# 3. VLAN-Tabelle: Welches VLAN auf welchem Port
#---------------------------------------------------------------
# Trunk-Port (ether1 = Uplink zum hEX S): Alle VLANs tagged
# Access-Ports: jeweiliges VLAN untagged

/interface bridge vlan

# VLAN 10 - Management
add bridge=bridge1 tagged=ether1 vlan-ids=10

# VLAN 20 - Trusted
add bridge=bridge1 tagged=ether1 untagged=ether13 vlan-ids=20

# VLAN 21 - Kinder
add bridge=bridge1 tagged=ether1 vlan-ids=21

# VLAN 30 - Smart Home
add bridge=bridge1 tagged=ether1 vlan-ids=30

# VLAN 40 - Media (Sonos)
add bridge=bridge1 tagged=ether1 untagged=ether12 vlan-ids=40

# VLAN 50 - Guest
add bridge=bridge1 tagged=ether1 untagged=ether16 vlan-ids=50

# VLAN 60 - Cameras
add bridge=bridge1 tagged=ether1 vlan-ids=60

# VLAN 70 - VPN Remote
add bridge=bridge1 tagged=ether1 vlan-ids=70

# VLAN 80 - Energy
add bridge=bridge1 tagged=ether1 vlan-ids=80

# VLAN 85 - VPN Media (TV, Formuler -> GL.iNet)
add bridge=bridge1 tagged=ether1 untagged=ether3,ether10,ether11,ether15 vlan-ids=85

# VLAN 99 - Transit (GL.iNet WAN)
add bridge=bridge1 tagged=ether1 untagged=ether2 vlan-ids=99

#---------------------------------------------------------------
# 4. Ingress-Filtering aktivieren (Sicherheit)
#---------------------------------------------------------------
# Verhindert, dass Geraete an Access-Ports fremde VLAN-Tags senden
/interface bridge port
set [find interface=ether2]  frame-types=admit-only-untagged-and-priority-tagged
set [find interface=ether3]  frame-types=admit-only-untagged-and-priority-tagged
set [find interface=ether10] frame-types=admit-only-untagged-and-priority-tagged
set [find interface=ether11] frame-types=admit-only-untagged-and-priority-tagged
set [find interface=ether12] frame-types=admit-only-untagged-and-priority-tagged
set [find interface=ether13] frame-types=admit-only-untagged-and-priority-tagged
set [find interface=ether15] frame-types=admit-only-untagged-and-priority-tagged
set [find interface=ether16] frame-types=admit-only-untagged-and-priority-tagged

#---------------------------------------------------------------
# 5. VLAN-Filtering aktivieren (LETZTER SCHRITT!)
#---------------------------------------------------------------
# WICHTIG: Erst aktivieren wenn alles stimmt!
# Zugriff auf Switch ueber ether1 (Trunk) sicherstellen!
/interface bridge set bridge1 vlan-filtering=yes

#---------------------------------------------------------------
# 6. System
#---------------------------------------------------------------
/system identity set name="SW24-Keller"

#===============================================================
# PORT-UEBERSICHT
#===============================================================
#
# Port  | Gerät               | VLAN | Modus
# ------|---------------------|------|--------
#  1    | hEX S Uplink        | ALL  | Trunk
#  2    | GL.iNet WAN         | 99   | Access
#  3    | GL.iNet LAN         | 85   | Access
#  4-9  | -- frei --          | -    | -
# 10    | Wohnzimmer TV       | 85   | Access
# 11    | Wohnzimmer Formuler | 85   | Access
# 12    | Wohnzimmer Sonos    | 40   | Access
# 13    | Wohnzimmer Trusted  | 20   | Access
# 14    | -- frei --          | -    | -
# 15    | Gästezi. Formuler   | 85   | Access
# 16    | Gästezi. Guest      | 50   | Access
# 17-24 | -- frei --          | -    | -
#
# Freie Ports einfach pvid + untagged-Eintrag anpassen,
# z.B. fuer Kameras (VLAN 60), Energy (VLAN 80), etc.
#
#===============================================================
