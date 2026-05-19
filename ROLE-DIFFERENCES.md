# Role-Based UI Differences

## Overview
The Fleet Manager application now has distinct user interfaces for **Admin** and **Driver** roles with full mission management capabilities.

## User Credentials

### Admin User
- **Email**: rania@admin.com
- **Password**: raniakhedri
- **Access Level**: Full management access (vehicles, drivers, missions)

### Driver User
- **Email**: ahmed@driver.com  
- **Password**: ahmedznati
- **Access Level**: Read-only for vehicles, can update assigned mission status

## Core Features

### 1. Vehicle Management
- Track all vehicles in real-time on map
- Monitor vehicle status (active, maintenance, inactive, on_mission)
- Assign vehicles to drivers
- View vehicle history and location tracking

### 2. Driver Management (Admin Only)
- Register new drivers with license information
- Manage driver profiles (contact info, status)
- Assign/unassign vehicles to drivers
- Track driver availability and assignments

### 3. Mission Management
- Create and assign missions to vehicles and drivers
- Track mission status (pending, in_progress, completed, cancelled)
- Set mission priority (low, normal, high, urgent)
- Define start/end locations with GPS coordinates
- Schedule mission start/end times
- Real-time mission progress tracking

## UI Differences by Role

### 1. Navigation Sidebar
**Admin:**
- Dashboard
- Live Map
- Fleet (Vehicles)
- **Drivers** (admin-only)
- **Missions** (admin-only)
- **Admin Settings** (admin-only)
- Admin badge displayed in user profile

**Driver:**
- Dashboard
- Live Map
- Fleet (read-only)
- Driver badge displayed in user profile

### 2. Dashboard Page
**Admin:**
- Full access to all statistics (4 stat cards including Avg Fuel Efficiency)
- Role badge: "Admin" with shield icon
- Description: "Real-time overview of your fleet status and location. Full management access."

**Driver:**
- Limited statistics (3 stat cards - Total Fleet, Active Vehicles, In Maintenance)
- Role badge: "Driver" with user icon
- Description: "Track vehicles and view fleet status."
- Blue info alert: "You have read-only access. Contact an administrator to request management permissions."

### 3. Vehicles Page (Fleet)
**Admin:**
- "Add Vehicle" button visible in header
- Full vehicle management actions in dropdown:
  - Track Location
  - **Edit Details** (admin-only)
  - **Delete Vehicle** (admin-only)
- Description: "Manage your vehicles and view their current status."

**Driver:**
- No "Add Vehicle" button
- Limited vehicle actions in dropdown:
  - Track Location only
  - No edit or delete options
- Description: "View all vehicles and their current status."

### 4. Drivers Page (Admin Only)
**Admin Access:**
- View all registered drivers
- Add new drivers with full details:
  - Name, email, phone number
  - License number and expiry date
  - Status (active, inactive, on_leave)
  - Vehicle assignment
- Edit driver information
- Remove drivers from system
- Track driver status and availability

**Driver Access:**
- Page not visible in navigation
- Redirected if attempting direct access

### 5. Missions Page
**Admin Access:**
- Create new missions with:
  - Title and description
  - Vehicle and driver assignment
  - Start/end locations (text + GPS coordinates)
  - Priority level (low, normal, high, urgent)
  - Scheduled start/end times
- View all missions across all drivers
- Update mission status
- Edit mission details
- Cancel missions
- Track mission progress in real-time

**Driver Access:**
- View assigned missions only
- Update status of own missions:
  - Start mission (pending → in_progress)
  - Complete mission (in_progress → completed)
- View mission details and location
- Cannot create, edit, or delete missions

### 6. Live Map
**Both Roles:**
- Real-time vehicle location tracking
- View all active vehicles on map
- Vehicle status indicators
- Click vehicle for details
- Auto-refresh every 10 seconds

**Admin Additional:**
- Can see missions overlaid on map
- Vehicle assignment indicators

## Backend API Protection

All admin-only routes are protected with JWT middleware:

### Vehicles
- `GET /api/vehicles` - View vehicles (all authenticated users)
- `GET /api/vehicles/:id` - View single vehicle (all authenticated users)
- `POST /api/vehicles` - Create vehicle (admin-only)
- `PUT /api/vehicles/:id` - Update vehicle (admin-only)
- `DELETE /api/vehicles/:id` - Delete vehicle (admin-only)

### Drivers
- `GET /api/drivers` - View drivers (all authenticated users)
- `GET /api/drivers/:id` - View single driver (all authenticated users)
- `POST /api/drivers` - Create driver (admin-only)
- `PUT /api/drivers/:id` - Update driver (admin-only)
- `DELETE /api/drivers/:id` - Delete driver (admin-only)

### Missions
- `GET /api/missions` - View missions (all authenticated users, filtered by role)
- `GET /api/missions/:id` - View single mission (all authenticated users)
- `POST /api/missions` - Create mission (admin-only)
- `PUT /api/missions/:id` - Update mission (admin-only)
- `DELETE /api/missions/:id` - Delete mission (admin-only)
- `PATCH /api/missions/:id/status` - Update status (all authenticated users for assigned missions)

### Locations
- `POST /api/vehicles/:id/location` - Update vehicle location (all authenticated users)
- `GET /api/vehicles/:id/history` - View location history (all authenticated users)

## Database Schema

### Tables
1. **users** - Authentication and user accounts
2. **vehicles** - Fleet vehicles with current location
3. **drivers** - Driver profiles and information
4. **missions** - Mission assignments and tracking
5. **locations** - Vehicle location history
6. **user_roles** - Extended user profile data
7. **sessions** - JWT session management

### Key Relationships
- Drivers ↔ Vehicles (assigned vehicle)
- Vehicles ↔ Missions (mission assignment)
- Drivers ↔ Missions (driver assignment)
- Vehicles ↔ Locations (tracking history)

## Technical Implementation

### Frontend Components Modified
1. **layout.tsx**: Navigation filtering based on `useUser()` hook
2. **dashboard.tsx**: Conditional stats display and role badge
3. **vehicles.tsx**: Conditional action buttons and form visibility
4. **drivers.tsx**: New driver management page (admin-only)
5. **missions.tsx**: New mission tracking page

### New Hooks Created
- **use-user.ts**: Extracts user info and role from localStorage
  - Returns: `{ user, isAdmin, isDriver }`
- **use-drivers.ts**: Driver CRUD operations
- **use-missions.ts**: Mission management and status updates

### Backend Protection
- **jwt-auth.ts**: `requireRole("admin")` middleware
- **routes.ts**: Admin-only routes protected with role check
- **storage.ts**: Database operations for drivers and missions
- Users attempting admin actions will receive 403 Forbidden response

## How to Test

1. **Login as Admin** (rania@admin.com / raniakhedri):
   - Navigate through all pages
   - Create/edit/delete vehicles, drivers, missions
   - Access Settings page
   - Notice admin badge and full controls

2. **Login as Driver** (ahmed@driver.com / ahmedznati):
   - Navigate through available pages
   - Notice Drivers, Missions, and Settings are hidden
   - Try to add/edit vehicles (buttons not visible)
   - See read-only alert on dashboard
   - Notice driver badge and limited stats

3. **Backend API Protection Test**:
   - Login as driver and get JWT token
   - Try calling `POST /api/vehicles` with driver token
   - Should receive 403 Forbidden error

## Visual Indicators

- **Admin Badge**: Blue/Primary color with Shield icon
- **Driver Badge**: Gray/Secondary color with User icon
- **Read-Only Alert**: Blue info alert on dashboard for drivers
- **Hidden Controls**: Admin-only buttons completely removed for drivers
- **Navigation**: Admin-only menu items visible only to admins
- **Mission Status Colors**:
  - Pending: Blue
  - In Progress: Amber
  - Completed: Green
  - Cancelled: Red

## UI Differences by Role

### 1. Navigation Sidebar
**Admin:**
- Dashboard
- Live Map
- Fleet
- **Admin Settings** (admin-only)
- Admin badge displayed in user profile

**User:**
- Dashboard
- Live Map
- Fleet
- No Settings menu
- User badge displayed in user profile

### 2. Dashboard Page
**Admin:**
- Full access to all statistics (4 stat cards including Avg Fuel Efficiency)
- Role badge: "Admin" with shield icon
- Description: "Real-time overview of your fleet status and location. Full management access."

**User:**
- Limited statistics (3 stat cards - Total Fleet, Active Vehicles, In Maintenance)
- Role badge: "User" with user icon
- Description: "Track vehicles and view fleet status."
- Blue info alert: "You have read-only access. Contact an administrator to request management permissions."

### 3. Vehicles Page (Fleet)
**Admin:**
- "Add Vehicle" button visible in header
- Full vehicle management actions in dropdown:
  - Track Location
  - **Edit Details** (admin-only)
  - **Delete Vehicle** (admin-only)
- Description: "Manage your vehicles and view their current status."

**User:**
- No "Add Vehicle" button
- Limited vehicle actions in dropdown:
  - Track Location only
  - No edit or delete options
- Description: "View all vehicles and their current status."

### 4. Backend API Protection
All admin-only routes are protected with JWT middleware:
- `POST /api/vehicles` - Create vehicle (admin-only)
- `PUT /api/vehicles/:id` - Update vehicle (admin-only)
- `DELETE /api/vehicles/:id` - Delete vehicle (admin-only)
- `GET /api/vehicles` - View vehicles (all authenticated users)
- `GET /api/vehicles/:id` - View single vehicle (all authenticated users)

## Technical Implementation

### Frontend Components Modified
1. **layout.tsx**: Navigation filtering based on `useUser()` hook
2. **dashboard.tsx**: Conditional stats display and role badge
3. **vehicles.tsx**: Conditional action buttons and form visibility

### New Hook Created
- **use-user.ts**: Extracts user info and role from localStorage
  - Returns: `{ user, isAdmin, isUser }`
  - Used throughout the app for role-based rendering

### Backend Protection
- **jwt-auth.ts**: `requireRole("admin")` middleware
- **routes.ts**: Admin-only routes protected with role check
- Users attempting admin actions will receive 403 Forbidden response

## How to Test

1. **Login as Admin** (rania@admin.com / raniakhedri):
   - Navigate through all pages
   - Try creating/editing/deleting vehicles
   - Access Settings page
   - Notice admin badge and full controls

2. **Login as Regular User** (ahmed@user.com / ahmedznati):
   - Navigate through available pages
   - Notice Settings is hidden
   - Try to add/edit vehicles (buttons not visible)
   - See read-only alert on dashboard
   - Notice user badge and limited stats

3. **Backend API Protection Test**:
   - Login as user and get JWT token
   - Try calling `POST /api/vehicles` with user token
   - Should receive 403 Forbidden error

## Visual Indicators

- **Admin Badge**: Blue/Primary color with Shield icon
- **User Badge**: Gray/Secondary color with User icon
- **Read-Only Alert**: Blue info alert on dashboard for users
- **Hidden Controls**: Admin-only buttons completely removed for users
- **Navigation**: Admin Settings menu only visible to admins
