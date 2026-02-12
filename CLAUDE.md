Aufgaben des network-admin-tool:

1. Netzwerkverwaltung
- Switches und VLAN Netzwerke in einem Home-Szenario sollen verwaltet werden
- dabei wird die Netzwerktopologie (Switches) erfasst und grafisch dargestellt
- Es gibt VLAN fähige Router, welche von Mikrotik stammen und Skriptingbefehle zur Konfiguration empfangen können.
- Es werden VLAN Subnetze konfiguriert
- Es wird das zugehörige Routing konfiguriert.


2. Zugangsprofile
- Samtliche am Netzwerk teilnehmende Geraäte können mit einem Zeitplan ausgestattet werden. Dabei kann z.B. "LG OLED TV" zu bestimmten Tageszeiten (anders am Wochenende als unter der Woche) geschaltet werden.
- Hier lehnen wir uns am der Implementierung der FritzBox an:
- <img width="618" height="536" alt="image" src="https://github.com/user-attachments/assets/5fa8baf0-fac9-48d7-b074-679ef54886e6" />

3. Front-end-App
- Ein Webapp zur Verwaltung wird erstellt. Diese soll insbesondere für Mobile View optimiert werden.

4. Deployment
- The app will run on a synology docker compose stack.
