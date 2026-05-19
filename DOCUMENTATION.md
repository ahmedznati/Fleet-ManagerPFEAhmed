# FleetGuard - Fleet Management System

## 📋 Project Overview

**FleetGuard** is a comprehensive fleet management web application that enables real-time tracking and management of vehicles, drivers, and missions. The system provides separate interfaces for administrators and drivers, with features including GPS tracking, mission assignment, and reporting.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
│                    React + TypeScript + Vite                     │
│                   GitHub Pages (Static Hosting)                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS (REST API)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND SERVER                              │
│                Express.js + TypeScript + Node.js                 │
│                      Render.com (Hosting)                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ PostgreSQL Protocol
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE                                  │
│                   PostgreSQL (Render.com)                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3.1 | UI Framework |
| **TypeScript** | 5.6.3 | Type Safety |
| **Vite** | 5.4.0 | Build Tool & Dev Server |
| **TailwindCSS** | 3.4.17 | Styling |
| **Radix UI** | Various | Accessible UI Components |
| **React Query** | 5.60.5 | Server State Management |
| **React Hook Form** | 7.55.0 | Form Handling |
| **Zod** | 3.24.2 | Schema Validation |
| **Wouter** | 3.3.5 | Client-side Routing |
| **Leaflet** | 1.9.4 | Interactive Maps |
| **Recharts** | 2.15.4 | Data Visualization |
| **Framer Motion** | 11.18.2 | Animations |
| **Lucide React** | 0.453.0 | Icons |
| **date-fns** | 3.6.0 | Date Manipulation |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 20.x | Runtime Environment |
| **Express.js** | 4.21.2 | Web Framework |
| **TypeScript** | 5.6.3 | Type Safety |
| **Drizzle ORM** | 0.39.3 | Database ORM |
| **PostgreSQL** | 8.16.3 (pg) | Database Driver |
| **JWT** | 9.0.2 | Authentication |
| **bcrypt** | 5.1.1 | Password Hashing |
| **Nodemailer** | 7.0.12 | Email Service |
| **Zod** | 3.24.2 | Request Validation |
| **CORS** | 2.8.5 | Cross-Origin Support |
| **express-session** | 1.18.2 | Session Management |

### DevOps & Deployment
| Tool | Purpose |
|------|---------|
| **GitHub Actions** | CI/CD Pipeline |
| **GitHub Pages** | Frontend Hosting |
| **Render.com** | Backend & Database Hosting |
| **ESBuild** | Backend Bundling |

---



## 🗄️ Database Schema

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   USERS     │       │  USER_ROLES │       │   DRIVERS   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │◄──────│ userId (FK) │       │ id (PK)     │
│ email       │       │ role        │──────►│ userId (FK) │
│ firstName   │       │ phoneNumber │       │ firstName   │
│ lastName    │       │ driverId(FK)│──────►│ lastName    │
│ passwordHash│       └─────────────┘       │ email       │
│ role        │                             │ phoneNumber │
│ createdAt   │                             │ licenseNumber│
└─────────────┘                             │ status      │
                                            └──────┬──────┘
                                                   │
      ┌────────────────────────────────────────────┼────────────────┐
      │                                            │                │
      ▼                                            ▼                ▼
┌─────────────┐                             ┌─────────────┐  ┌─────────────┐
│  VEHICLES   │                             │  MISSIONS   │  │  LOCATIONS  │
├─────────────┤                             ├─────────────┤  ├─────────────┤
│ id (PK)     │◄────────────────────────────│ vehicleId   │  │ id (PK)     │
│ name        │                             │ driverId    │  │ vehicleId   │
│ model       │                             │ title       │  │ lat         │
│ licensePlate│                             │ description │  │ lng         │
│ status      │                             │ endLocation │  │ speed       │
│ fuelLevel   │                             │ status      │  │ heading     │
│ lat/lng     │                             │ priority    │  │ timestamp   │
│ currentDriverId│                          │ scheduledStart│ └─────────────┘
└─────────────┘                             │ actualEnd   │
                                            └─────────────┘
```

### Tables Description

| Table | Description |
|-------|-------------|
| **users** | User accounts with authentication credentials |
| **sessions** | Session storage for authenticated users |
| **user_roles** | Role assignments (admin/driver) for users |
| **drivers** | Driver profiles with license information |
| **vehicles** | Fleet vehicles with status and location |
| **missions** | Mission/trip assignments with scheduling |
| **locations** | GPS location history for vehicles |

### Status Enums

**Vehicle Status:**
- `active` - Available for missions
- `maintenance` - Under maintenance
- `inactive` - Not in service
- `on_mission` - Currently on a mission

**Driver Status:**
- `active` - Available for assignments
- `inactive` - Not available
- `on_leave` - On leave

**Mission Status:**
- `pending` - Scheduled but not started
- `in_progress` - Currently active
- `completed` - Successfully finished
- `cancelled` - Cancelled

**Mission Priority:**
- `low` | `normal` | `high` | `urgent`

---

## 🔐 Authentication System

### JWT-Based Authentication

```
┌──────────┐     POST /api/auth/login     ┌──────────┐
│  Client  │ ─────────────────────────────►│  Server  │
│          │     { email, password }       │          │
│          │                               │          │
│          │◄───────────────────────────── │          │
│          │     { token, user }           │          │
└──────────┘                               └──────────┘
      │
      │ Store token in localStorage
      ▼
┌──────────┐     GET /api/protected       ┌──────────┐
│  Client  │ ─────────────────────────────►│  Server  │
│          │  Authorization: Bearer <token>│          │
└──────────┘                               └──────────┘
```

### User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Admin** | Full access: Manage vehicles, drivers, missions, view reports, settings |
| **Driver** | Limited access: View assigned missions, update profile, view own stats |

---

## 🌐 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register` | User registration |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | User logout |

### Vehicles
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vehicles` | List all vehicles |
| GET | `/api/vehicles/:id` | Get vehicle details |
| POST | `/api/vehicles` | Create vehicle |
| PUT | `/api/vehicles/:id` | Update vehicle |
| DELETE | `/api/vehicles/:id` | Delete vehicle |
| POST | `/api/vehicles/:id/location` | Update vehicle location |

### Drivers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/drivers` | List all drivers |
| GET | `/api/drivers/:id` | Get driver details |
| POST | `/api/drivers` | Create driver |
| PUT | `/api/drivers/:id` | Update driver |
| DELETE | `/api/drivers/:id` | Delete driver |

### Missions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/missions` | List all missions |
| GET | `/api/missions/:id` | Get mission details |
| POST | `/api/missions` | Create mission |
| PUT | `/api/missions/:id` | Update mission |
| DELETE | `/api/missions/:id` | Delete mission |
| PUT | `/api/missions/:id/status` | Update mission status |

### User Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/profile` | Get user profile |
| PUT | `/api/user/profile` | Update user profile |

---

## 🚀 Deployment

### Frontend (GitHub Pages)

**URL:** `https://raniakhedri.github.io/Fleet-Manager/`

**CI/CD Pipeline:**
1. Push to `master` branch (changes in `frontend/`)
2. GitHub Actions triggers `deploy-frontend.yml`
3. Installs dependencies (backend + frontend)
4. Builds frontend with Vite
5. Deploys to `gh-pages` branch
6. GitHub Pages serves the static files

### Backend (Render.com)

**Deployment Process:**
1. Push to `master` branch
2. Render.com auto-deploys from GitHub
3. Runs `npm run build` (ESBuild)
4. Starts server with `npm start`

**Environment Variables:**
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
NODE_ENV=production
FRONTEND_URL=https://raniakhedri.github.io/Fleet-Manager/
```

---

## 💻 Local Development

### Prerequisites
- Node.js 20.x
- PostgreSQL database
- npm or yarn

### Quick Start

```powershell
# 1. Clone the repository
git clone https://github.com/ahmedznati/Fleet-ManagerAhmed.git
cd Fleet-ManagerAhmed

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Set up environment variables
# Backend: backend/.env
DATABASE_URL=postgres://user:pass@localhost:5432/fleetdb
JWT_SECRET=your-dev-secret
NODE_ENV=development

# 4. Run database migrations
cd backend && npm run db:push

# 5. Start development servers
# Terminal 1 - Backend:
cd backend && npm run dev

# Terminal 2 - Frontend:
cd frontend && npm run dev
```

Or use the PowerShell script:
```powershell
.\start.ps1
```

### Access Points
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000

### Demo Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | rania@admin.com | raniakhedri |
| Driver | ahmed@user.com | ahmedznati |

---

## 📱 PWA Features

FleetGuard is a Progressive Web App with:

- ✅ **Installable** - Add to home screen
- ✅ **Offline Support** - Service Worker caching
- ✅ **Responsive Design** - Mobile-first approach
- ✅ **Push Ready** - Notification infrastructure

### Manifest Configuration
```json
{
  "name": "FleetGuard",
  "short_name": "FleetGuard",
  "start_url": "/Fleet-ManagerAhmed/",
  "display": "standalone",
  "theme_color": "#2563eb"
}
```

---

## 🎨 UI/UX Features

### Design System
- **Color Palette:** Cream, Gold, Crimson theme
- **Typography:** Custom font stack with Google Fonts
- **Components:** Based on Radix UI primitives
- **Animations:** Framer Motion for smooth transitions

### Key Pages

| Page | Features |
|------|----------|
| **Landing** | Hero section, features overview, CTA |
| **Dashboard** | Stats cards, recent activity, quick actions |
| **Live Map** | Real-time vehicle tracking with Leaflet |
| **Vehicles** | CRUD table, status badges, location display |
| **Drivers** | Driver list, assignment status, license info |
| **Missions** | Mission board, priority tags, status workflow |
| **Reports** | Charts, statistics, export options |

---

## 🔧 Configuration Files

### Vite Config (`frontend/vite.config.ts`)
- Base path: `/Fleet-ManagerAhmed/` for production
- Output: `../docs` folder
- Aliases: `@/` for src, `@shared/` for backend shared

### Tailwind Config (`frontend/tailwind.config.ts`)
- Custom colors: cream, gold, crimson
- Extended animations
- Typography plugin

### Drizzle Config (`backend/drizzle.config.ts`)
- PostgreSQL dialect
- Schema location: `shared/schema.ts`

---

## 📝 Scripts Reference

### Backend
```json
{
  "dev": "node --import tsx server/index.ts",
  "build": "node --import tsx script/build.ts",
  "start": "node dist/index.cjs",
  "db:push": "drizzle-kit push"
}
```

### Frontend
```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👥 Authors

- **Ahmed Znati** - Development & Deployment

---

## 🔗 Links

- **Live Demo:** https://raniakhedri.github.io/Fleet-Manager/
- **Backend API:** Hosted on Render.com
- **Repository:** https://github.com/ahmedznati/Fleet-ManagerAhmed

---

┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
├─────────────────────────────────────────────────────────────────┤
│  React ──────► Composants UI                                    │
│  TypeScript ──► Types & sécurité                                │
│  Vite ────────► Compilation & dev server                        │
│  Tailwind ────► Styles CSS                                      │
│  React Query ─► Appels API & cache                              │
│  Wouter ──────► Navigation pages                                │
│  Leaflet ─────► Cartes GPS                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ API REST (JSON)
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND                                   │
├─────────────────────────────────────────────────────────────────┤
│  Express ─────► Routes API                                      │
│  JWT ─────────► Authentification                                │
│  bcrypt ──────► Mots de passe                                   │
│  Drizzle ─────► Requêtes BDD                                    │
│  Zod ─────────► Validation données                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ SQL
┌─────────────────────────────────────────────────────────────────┐
│                      PostgreSQL                                  │
└─────────────────────────────────────────────────────────────────┘