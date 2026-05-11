<!-- Anointed Hands Booking Platform - Project Setup Guide -->

# Anointed Hands Booking Platform

## Project Overview
Full-stack web application for salon services booking, in-salon café ordering, and operations dashboard with manual EFT payment processing.

**Tech Stack:**
- Backend: ASP.NET Core 8.0 (C#)
- Frontend: React 18+ with TypeScript
- Database: SQL Server / LocalDB
- Styling: Tailwind CSS with elegant salon theme

**Phase 1 MVP Features:**
- Services & café menu display with images
- Booking form with calendar and stylist selection
- In-salon order form with order numbers
- Admin panel for bookings and orders management
- Manual "Mark Paid" button for EFT payments

## Development Setup

### Prerequisites
- .NET 8 SDK
- Node.js 18+ and npm
- SQL Server LocalDB or Management Studio

### Backend Setup
```bash
cd backend/AnoitedHands.Api
dotnet restore
dotnet build
dotnet ef database update
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## Project Structure
```
Anointed Hands/
├── backend/
│   └── AnoitedHands.Api/          # ASP.NET Core API
│       ├── Controllers/            # API endpoints
│       ├── Models/                 # Domain models
│       ├── Data/                   # EF Core DbContext
│       ├── Services/               # Business logic
│       └── DTOs/                   # Data transfer objects
├── frontend/
│   └── src/                        # React TypeScript app
│       ├── pages/                  # Page components
│       ├── components/             # Reusable components
│       ├── services/               # API client services
│       ├── types/                  # TypeScript interfaces
│       └── styles/                 # Global styles
└── docs/                           # Documentation
```

## API Endpoints (Phase 1)
- `GET /api/services` - All services
- `GET /api/cafe-items` - All café items
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - Get all bookings
- `POST /api/orders` - Create in-salon order
- `GET /api/orders` - Get all orders
- `POST /api/payments/mark-paid` - Mark payment as received

## Database Schema (Phase 1)
- Services
- CafeItems
- Bookings
- Orders
- Payments
- Users (basic customer profile)

## Styling & Branding
- Primary: Elegant salon color scheme (soft purples/golds)
- Theme: Professional yet welcoming
- Logo: Upload location: `frontend/public/assets/images/logo.png`
- Background: Elegant salon setup imagery

## Next Steps
1. Run `dotnet ef migrations add InitialCreate` to create database
2. Run `npm start` to start React dev server
3. API will run on `http://localhost:5000`
4. Frontend will run on `http://localhost:3000`
