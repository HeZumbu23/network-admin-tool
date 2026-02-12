# Network Admin Tool - Implementation Plan

## Overview

A mobile-first web application for managing home network infrastructure: switches, VLANs, MikroTik routers, device access profiles with time-based scheduling, and network topology visualization.

---

## Tech Stack

| Layer        | Technology                        | Rationale                                                  |
| ------------ | --------------------------------- | ---------------------------------------------------------- |
| Frontend     | React 18 + TypeScript             | Component-based, strong ecosystem for data visualization   |
| UI Framework | Tailwind CSS                      | Mobile-first utility classes, fast prototyping              |
| Topology Viz | React Flow                        | Interactive node/edge graphs, built for React              |
| Backend      | Node.js + Express + TypeScript    | Same language as frontend, strong MikroTik library support  |
| Database     | SQLite via better-sqlite3         | Zero-config, perfect for home/single-user scenario         |
| ORM          | Drizzle ORM                       | Type-safe, lightweight, great SQLite support               |
| MikroTik API | routeros-client (npm)             | Native RouterOS API integration                            |
| Build        | Vite                              | Fast dev server, optimized builds                          |
| Monorepo     | npm workspaces                    | Simple, no extra tooling needed                            |

---

## Project Structure

```
network-admin-tool/
├── package.json                  # Root workspace config
├── packages/
│   ├── frontend/                 # React SPA
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── index.html
│   │   ├── tailwind.config.ts
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── api/              # API client functions
│   │       ├── components/
│   │       │   ├── layout/       # Shell, Navbar, MobileNav
│   │       │   ├── topology/     # Network graph components
│   │       │   ├── switches/     # Switch management UI
│   │       │   ├── vlans/        # VLAN configuration UI
│   │       │   ├── devices/      # Device list & details
│   │       │   └── schedules/    # Time-based access profiles
│   │       ├── pages/
│   │       │   ├── DashboardPage.tsx
│   │       │   ├── TopologyPage.tsx
│   │       │   ├── SwitchesPage.tsx
│   │       │   ├── VlansPage.tsx
│   │       │   ├── DevicesPage.tsx
│   │       │   └── SchedulesPage.tsx
│   │       └── hooks/
│   └── backend/                  # Express API server
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts          # Server entry
│           ├── db/
│           │   ├── schema.ts     # Drizzle schema
│           │   └── migrate.ts
│           ├── routes/
│           │   ├── switches.ts
│           │   ├── vlans.ts
│           │   ├── devices.ts
│           │   ├── schedules.ts
│           │   └── mikrotik.ts
│           └── services/
│               ├── mikrotik.ts   # RouterOS API integration
│               └── scheduler.ts  # Cron-based schedule executor
```

---

## Database Schema

### Tables

**switches**
| Column      | Type    | Description                          |
| ----------- | ------- | ------------------------------------ |
| id          | INTEGER | Primary key                          |
| name        | TEXT    | e.g. "Wohnzimmer Switch"            |
| model       | TEXT    | e.g. "MikroTik CRS326"             |
| ip_address  | TEXT    | Management IP                        |
| port_count  | INTEGER | Number of physical ports              |
| is_managed  | BOOLEAN | Whether it supports VLAN tagging     |
| location    | TEXT    | Physical location in the home        |
| pos_x       | REAL    | X position on topology canvas        |
| pos_y       | REAL    | Y position on topology canvas        |
| created_at  | TEXT    | ISO timestamp                        |

**switch_ports**
| Column      | Type    | Description                          |
| ----------- | ------- | ------------------------------------ |
| id          | INTEGER | Primary key                          |
| switch_id   | INTEGER | FK → switches                        |
| port_number | INTEGER | Physical port number                 |
| label       | TEXT    | Optional label                       |
| vlan_mode   | TEXT    | 'access' or 'trunk'                 |
| pvid        | INTEGER | Port VLAN ID (access mode)           |
| trunk_vlans | TEXT    | JSON array of allowed VLAN IDs       |

**vlans**
| Column      | Type    | Description                          |
| ----------- | ------- | ------------------------------------ |
| id          | INTEGER | Primary key                          |
| vlan_id     | INTEGER | 802.1Q VLAN ID (1-4094)             |
| name        | TEXT    | e.g. "IoT", "Gäste", "Kinder"      |
| subnet      | TEXT    | e.g. "192.168.10.0/24"              |
| gateway     | TEXT    | e.g. "192.168.10.1"                 |
| dhcp_enabled| BOOLEAN | Whether DHCP is active               |
| dhcp_range  | TEXT    | e.g. "192.168.10.100-192.168.10.200"|
| description | TEXT    | Optional                             |

**devices**
| Column      | Type    | Description                          |
| ----------- | ------- | ------------------------------------ |
| id          | INTEGER | Primary key                          |
| name        | TEXT    | e.g. "LG OLED TV"                   |
| mac_address | TEXT    | Unique MAC                           |
| ip_address  | TEXT    | Current/assigned IP                  |
| vlan_id     | INTEGER | FK → vlans                           |
| switch_id   | INTEGER | FK → switches (nullable)             |
| port_number | INTEGER | Connected port (nullable)            |
| device_type | TEXT    | 'tv', 'phone', 'laptop', 'iot' etc |
| is_online   | BOOLEAN | Current status                       |

**access_profiles**
| Column      | Type    | Description                          |
| ----------- | ------- | ------------------------------------ |
| id          | INTEGER | Primary key                          |
| name        | TEXT    | Profile name                         |
| device_id   | INTEGER | FK → devices                         |
| is_active   | BOOLEAN | Whether schedule is enforced         |

**schedule_rules**
| Column      | Type    | Description                          |
| ----------- | ------- | ------------------------------------ |
| id          | INTEGER | Primary key                          |
| profile_id  | INTEGER | FK → access_profiles                 |
| day_type    | TEXT    | 'weekday', 'weekend', or specific day|
| start_time  | TEXT    | HH:MM format - internet access ON    |
| end_time    | TEXT    | HH:MM format - internet access OFF   |

**connections** (topology edges)
| Column        | Type    | Description                        |
| ------------- | ------- | ---------------------------------- |
| id            | INTEGER | Primary key                        |
| from_switch_id| INTEGER | FK → switches                      |
| from_port     | INTEGER | Port number on source switch       |
| to_switch_id  | INTEGER | FK → switches                      |
| to_port       | INTEGER | Port number on target switch       |
| link_type     | TEXT    | 'trunk', 'access'                 |

---

## API Endpoints

### Switches
- `GET    /api/switches`          - List all switches
- `POST   /api/switches`          - Add a switch
- `GET    /api/switches/:id`      - Get switch details + ports
- `PUT    /api/switches/:id`      - Update switch
- `DELETE /api/switches/:id`      - Remove switch
- `PUT    /api/switches/:id/ports/:portNum` - Configure port VLAN settings

### VLANs
- `GET    /api/vlans`             - List all VLANs
- `POST   /api/vlans`             - Create VLAN
- `PUT    /api/vlans/:id`         - Update VLAN
- `DELETE /api/vlans/:id`         - Delete VLAN

### Devices
- `GET    /api/devices`           - List all devices
- `POST   /api/devices`           - Register device
- `PUT    /api/devices/:id`       - Update device
- `DELETE /api/devices/:id`       - Remove device

### Access Profiles / Schedules
- `GET    /api/profiles`          - List all access profiles
- `POST   /api/profiles`          - Create profile with rules
- `GET    /api/profiles/:id`      - Get profile + schedule rules
- `PUT    /api/profiles/:id`      - Update profile + rules
- `DELETE /api/profiles/:id`      - Delete profile
- `POST   /api/profiles/:id/toggle` - Enable/disable profile

### Topology
- `GET    /api/topology`          - Get full topology (switches + connections)
- `PUT    /api/topology/positions` - Save switch positions on canvas
- `POST   /api/connections`       - Create connection between switches
- `DELETE /api/connections/:id`   - Remove connection

### MikroTik
- `POST   /api/mikrotik/test`     - Test connection to router
- `POST   /api/mikrotik/apply-vlan` - Push VLAN config to router
- `POST   /api/mikrotik/apply-routing` - Push routing config to router

---

## Implementation Phases

### Phase 1: Project Scaffolding
- Initialize npm workspace monorepo
- Set up frontend (Vite + React + TypeScript + Tailwind)
- Set up backend (Express + TypeScript + Drizzle + SQLite)
- Create database schema and migrations
- Build mobile-first app shell with navigation

### Phase 2: Network Management (Core)
- CRUD for switches and switch ports
- CRUD for VLANs with subnet configuration
- Topology connections between switches
- Interactive topology visualization with React Flow
- Drag-and-drop positioning of switches on the canvas

### Phase 3: Device Management & Access Profiles
- Device registration and VLAN assignment
- Access profile CRUD
- Weekly schedule editor UI (FritzBox-inspired time grid)
  - Visual time blocks for weekdays vs. weekends
  - Drag to select allowed/blocked time ranges
- Schedule enforcement service (cron-based)

### Phase 4: MikroTik Integration
- RouterOS API connection management
- Generate and push VLAN bridge/port configuration scripts
- Generate and push routing table configuration
- Connection testing and status feedback

### Phase 5: Polish & Optimization
- Dashboard with network overview stats
- Responsive design fine-tuning for small screens
- Error handling and validation
- Loading states and optimistic updates

---

## Key UI Components

### Mobile Navigation
Bottom tab bar with icons: Dashboard, Topology, Switches, Devices, Schedules

### Topology View
- React Flow canvas showing switches as nodes, connections as edges
- Tap a switch node to see port details
- Color-coded VLAN overlay

### Schedule Editor (FritzBox-style)
- 7-day weekly grid (Mo-So)
- 24h time axis
- Tap/drag to create "allowed" time blocks (green)
- Remaining time = "blocked" (red)
- Separate weekday/weekend templates with option to customize per-day
