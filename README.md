# 🚀 TrackX - Enterprise Real-Time Bus Tracking System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)

**TrackX** is a production-ready, enterprise-grade real-time bus tracking system designed for educational institutions. It provides live GPS tracking, driver management, and an intuitive admin dashboard.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Environment Setup](#-environment-setup)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)

---

## ✨ Features

### 🎯 Public User View (Students)
- Real-time bus tracking on interactive map
- Bus speed and last update information
- "Bus Offline" indicator (no update for 2 minutes)
- Auto-pan to live bus position
- Custom map tiles support

### 🔧 Admin Panel
- **Bus Management**: Add/Edit/Delete buses, assign drivers, generate API keys
- **Driver Management**: CRUD operations, photo upload, credential management
- **Dashboard**: Real-time statistics, bus status overview
- **API Key Generator**: Unique keys per bus for GPS devices

### 📱 Driver App (PWA)
- Mobile-friendly Progressive Web App
- Browser-based geolocation tracking
- Start/Stop tracking functionality
- Profile management
- Location history log

### 🛰️ GPS Device Integration
- Secure REST endpoint for GPS devices
- API key authentication
- Real-time coordinate broadcasting
- Speed and timestamp tracking

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Real-time**: Socket.IO
- **Database**: PostgreSQL + Prisma ORM
- **Cache**: Redis
- **Auth**: JWT (Access + Refresh tokens)
- **Validation**: Zod
- **Security**: Helmet, bcrypt, rate-limiting

### Frontend
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Maps**: Leaflet.js
- **Real-time**: Socket.IO Client
- **Animations**: Framer Motion
- **State**: React Context API

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         TrackX Architecture                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │ GPS Device   │    │ Driver App   │    │ Student View     │   │
│  │ (Hardware)   │    │ (PWA)        │    │ (Web)            │   │
│  └──────┬───────┘    └──────┬───────┘    └────────┬─────────┘   │
│         │                   │                     │              │
│         │ POST /api/gps     │ POST /api/gps       │ Socket.IO    │
│         │                   │                     │              │
│         ▼                   ▼                     ▼              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Express.js Backend                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │   │
│  │  │ REST API    │  │ Socket.IO   │  │ Middlewares     │   │   │
│  │  │ Controllers │  │ Server      │  │ (Auth, Rate)    │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘   │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│                           │                                      │
│         ┌─────────────────┼─────────────────┐                   │
│         ▼                 ▼                 ▼                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  PostgreSQL  │  │    Redis     │  │   Socket.IO  │          │
│  │  (Prisma)    │  │   (Cache)    │  │   Broadcast  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/trackx.git
cd trackx

# Install backend dependencies
cd server
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npx prisma migrate dev

# Seed the database (optional)
npm run seed

# Start the backend
npm run dev

# In a new terminal, install frontend dependencies
cd ../client
npm install

# Start the frontend
npm run dev
```

---

## ⚙️ Environment Setup

### Backend (.env)

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/trackx"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT Secrets
JWT_ACCESS_SECRET="your-super-secret-access-key-min-32-chars"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-min-32-chars"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"

# Server
PORT=3001
NODE_ENV="development"

# CORS
CORS_ORIGIN="http://localhost:5173"
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
VITE_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

---

## 📖 API Documentation

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Login (Admin/Driver) |
| `/api/auth/refresh` | POST | Refresh access token |
| `/api/auth/logout` | POST | Logout and blacklist token |

### GPS Updates

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/gps/update` | POST | Update bus location |

### Admin Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/buses` | GET/POST | List/Create buses |
| `/api/admin/buses/:id` | GET/PUT/DELETE | Bus CRUD |
| `/api/admin/drivers` | GET/POST | List/Create drivers |
| `/api/admin/drivers/:id` | GET/PUT/DELETE | Driver CRUD |
| `/api/admin/dashboard` | GET | Dashboard stats |
| `/api/admin/api-keys/generate` | POST | Generate bus API key |

### Driver Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/driver/profile` | GET/PUT | Driver profile |
| `/api/driver/location-history` | GET | Last 10 locations |

---

## 🚢 Deployment

### Render

1. Create a new Web Service for the backend
2. Set environment variables
3. Build command: `npm install && npx prisma migrate deploy`
4. Start command: `npm start`

### Vercel (Frontend)

1. Import the `client` folder
2. Set environment variables
3. Deploy automatically

### Docker

```bash
docker-compose up -d
```

---

## 📄 License

MIT License - feel free to use this project for your institution.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

**Built with ❤️ by TrackX Team**
