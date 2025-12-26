# 🚀 TrackX Platinum - Enterprise Real-Time Bus Tracking

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Latest-green.svg)](https://www.mongodb.com/)

**TrackX Platinum** is a production-hardened, enterprise-grade multi-tenant bus tracking platform. Designed specifically for large educational institutions, it offers a high-performance telemetry engine, robust organizational isolation, and a premium "Warm Sage" user interface.

---

## 💎 Platinum Infrastructure Updates

The platform has recently been upgraded to **Platinum Status**, featuring:
- **Atomic Reset Logic**: New `reset-platinum` engine that wipes institutional data while preserving core system governance (Super Admin & Master Org).
- **Graceful Deletion Sequencing**: Handles complex foreign key and unique constraint scenarios (e.g., Driver-Bus-Org relationships) without database errors.
- **Strict Tenant Enforcement**: Optimized tracking flow that strictly validates institution codes before revealing telemetry data, preventing orphaned search sessions.
- **Auth Hardening**: Corrected organization state propagation during admin authentication to ensure zero-downtime access to institutional dashboards.

---

## ✨ Features

### 🎯 Public Tracking (Students)
- **Institution-Locked Tracking**: Students enter a unique college code to access their specific fleet.
- **Smart ETA Prediction**: Real-time arrival estimates based on traffic factors and historical telemetry.
- **Dynamic Route Mapping**: Interactive visual progress bar showing stops reached and upcoming waypoints.

### 🔧 Administrative Dashboard
- **Institutional Governance**: Full control over buses, drivers, and route stops.
- **Hardware API Hub**: Generate and rotate secure API keys for external GPS hardware integration.
- **Master Metrics**: Live dashboard showing fleet health, online/offline status, and system telemetry.

### 📱 Driver Application
- **Zero-Config Tracking**: Simplified PWA allowing drivers to sync location with a single tap.
- **Battery-Optimized Engine**: Efficient GPS polling that minimizes device power consumption.

---

## 🛠️ Tech Stack

- **Backend**: Node.js (ESM), Express, Socket.IO 4.x, Prisma (MongoDB)
- **Frontend**: React 18, Vite, Framer Motion, Leaflet.js
- **Security**: JWT Identity Rotation, bcryptjs (Salt 10), Organization Scoping

---

## 🚀 Quick Start & Reset

### Installation
```bash
# Clone and Install
git clone https://github.com/selvakumaran-dev/trackx.git
cd trackx

# Setup Server
cd server && npm install
cp .env.example .env # Configure DATABASE_URL

# Initial Provisioning
npm run seed
npm run dev
```

### Platinum Reset (Fresh Start)
To wipe all test data/organizations while keeping your Super Admin access:
```bash
npm run reset-platinum
```

---

## 🔐 Default Credentials (Platinum Seed)

| Role | Email | Password | Code |
|------|-------|----------|----------|
| **Super Admin** | `root@trackx.com` | `Admin@123` | `TRACKX` |

*Note: Institutional admins and drivers are created dynamically via the Admin Panel or Registration flow.*

---

## 📄 License & Development

Built for institutional excellence by the **TrackX Development Team**.
Licensed under the MIT License.

