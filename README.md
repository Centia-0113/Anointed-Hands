# Anointed Hands - Full Stack Booking Platform

A complete booking and management platform for a salon and in-salon café with elegant design and manual EFT payment processing.

## 🎯 Features (Phase 1 MVP)

### Customer Side
- **Services & Menu Display**: Browse hair services, nails, facials, and café items with images and pricing
- **Appointment Booking**: Pick service → stylist → date/time with live availability
- **In-Salon Ordering**: Place café orders with order numbers (name, items, notes)
- **Payment & EFT**: Get unique payment reference, pay via EFT, mark as paid
- **Order Status**: Track order status (Received → Preparing → Ready)

### Admin/Operations Side
- **Dashboard**: Live view of bookings, orders, and payment status
- **Payment Management**: Mark orders and bookings as paid with payment reference
- **Search & Filter**: Find transactions by customer name or payment reference
- **Status Updates**: Update order and booking statuses

## 🏗️ Architecture

### Backend
- **Framework**: ASP.NET Core 8.0 (C#)
- **Database**: SQL Server / LocalDB
- **Architecture**: Clean layers (Controllers → Services → Data)
- **API**: RESTful with Swagger documentation

### Frontend
- **Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS with elegant salon theme
- **Routing**: React Router for multi-page navigation
- **API Client**: Axios with centralized service layer
- **Notifications**: React Hot Toast for user feedback

## 📁 Project Structure

```
Anointed Hands/
├── backend/
│   └── AnoitedHands.Api/
│       ├── Controllers/          # API endpoints
│       ├── Models/              # Domain entities
│       ├── Data/                # EF Core DbContext
│       ├── Services/            # Business logic
│       ├── DTOs/                # Data transfer objects
│       ├── Program.cs           # Startup configuration
│       ├── appsettings.json     # Configuration
│       └── AnoitedHands.Api.csproj
├── frontend/
│   ├── src/
│   │   ├── pages/               # Page components
│   │   ├── components/          # Reusable components
│   │   ├── services/            # API client
│   │   ├── types/               # TypeScript interfaces
│   │   ├── styles/              # Global styles
│   │   ├── App.tsx              # Main app component
│   │   └── index.tsx            # Entry point
│   ├── public/
│   │   ├── index.html           # HTML template
│   │   └── assets/
│   │       └── images/          # Logo and assets
│   ├── package.json
│   ├── tsconfig.json
│   └── tailwind.config.js
└── README.md
```

## 🚀 Quick Start

### Backend Setup
```bash
cd backend/AnoitedHands.Api
dotnet restore
dotnet build
dotnet ef database update
dotnet run
```
API runs on `http://localhost:5000`

### Frontend Setup
```bash
cd frontend
npm install
npm start
```
Frontend runs on `http://localhost:3000`

## 🌐 API Endpoints

### Core Resources
- `GET /api/services` - All services
- `GET /api/cafeitems` - All café items
- `GET /api/stylists` - All stylists

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - Get all bookings
- `GET /api/bookings/available-slots` - Available time slots
- `POST /api/bookings/{id}/mark-paid` - Mark booking paid

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - Get all orders
- `PUT /api/orders/{id}/status` - Update order status
- `POST /api/orders/{id}/mark-paid` - Mark order paid

## 💳 Payment Flow

1. Customer books service or places order
2. System generates unique payment reference (e.g., `AH-45234`)
3. Customer pays via EFT using that reference
4. Admin checks bank, finds payment, clicks "Mark Paid"
5. System updates payment status and notifies customer

## 🎨 Design

- **Color Scheme**: Elegant salon theme (soft purples, golds, oranges)
- **Typography**: Georgia/Garamond serif fonts for elegance
- **Components**: Card-based layout with smooth transitions
- **Responsive**: Mobile-first design with Tailwind CSS

## 📦 Seeded Data

The API comes pre-seeded with:

**Services**: 5 services (Hair, Nails, Facials)
**Stylists**: 3 stylists with specializations
**Café Items**: 5 café items (Cakes, Muffins, Donuts, Drinks)

## 📝 Configuration

### Backend (appsettings.json)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=AnoitedHands;"
  },
  "CompanySettings": {
    "Name": "Anointed Hands",
    "BankAccount": "YOUR_ACCOUNT",
    "ContactEmail": "contact@anoitedhandsalon.com"
  }
}
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## 🔄 Phase 2 & 3 Roadmap

**Phase 2 - Make it smooth**
- SMS/email confirmations and reminders
- Customer account with booking/order history
- Weekly email report to admin

**Phase 3 - Polish**
- Ratings/reviews for services and food
- Inventory tracking for café items
- Refund workflow with T&C logic
- Dashboard charts for revenue trends

## 📄 License

Private project for Anointed Hands
