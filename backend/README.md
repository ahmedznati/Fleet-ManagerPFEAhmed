# Fleet Manager Backend

Express.js API server with PostgreSQL database, JWT authentication, and role-based access control.

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
Edit `.env` file with your database credentials.

3. **Run database migrations:**
```bash
npm run db:push
```

4. **Start development server:**
```bash
npm run dev
```
Or run: `start.bat`

Server runs on **http://localhost:3000**

## API Endpoints

### Authentication
- `POST /api/signup` - Create new user
- `POST /api/login` - Login and get JWT token

### Vehicles (requires JWT)
- `GET /api/vehicles` - List all vehicles
- `GET /api/vehicles/:id` - Get vehicle details
- `POST /api/vehicles` - Create vehicle (admin only)
- `PUT /api/vehicles/:id` - Update vehicle (admin only)
- `DELETE /api/vehicles/:id` - Delete vehicle (admin only)
- `POST /api/vehicles/:id/location` - Update vehicle location
- `GET /api/vehicles/:id/history` - Get location history

## Default Users

- **Admin**: rania@admin.com / raniakhedri
- **User**: ahmed@user.com / ahmedznati
