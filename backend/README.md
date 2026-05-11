# Anointed Hands - Backend API

ASP.NET Core 8.0 backend API for the Anointed Hands booking and café management platform.

## Prerequisites

- .NET 8 SDK
- SQL Server LocalDB (or configured database)

## Setup

```bash
cd backend/AnoitedHands.Api
dotnet restore
dotnet build
```

## Create Database

Run Entity Framework migrations to create the database:

```bash
dotnet ef database update
```

This will create a local SQL Server database with seeded data (services, stylists, café items).

## Running the API

```bash
dotnet run
```

API will be available at `http://localhost:5000`

Swagger UI: `http://localhost:5000/swagger`

## API Endpoints

### Services
- `GET /api/services` - Get all active services
- `GET /api/services/{id}` - Get service by ID

### Café Items
- `GET /api/cafeitems` - Get all active café items
- `GET /api/cafeitems/{id}` - Get café item by ID

### Stylists
- `GET /api/stylists` - Get all active stylists
- `GET /api/stylists/{id}` - Get stylist by ID

### Bookings
- `GET /api/bookings` - Get all bookings
- `POST /api/bookings` - Create new booking
- `GET /api/bookings/{id}` - Get booking by ID
- `GET /api/bookings/available-slots?stylistId=1&serviceId=1&date=2024-01-15` - Get available time slots
- `GET /api/bookings/search?customerName=John&paymentReference=AH-123` - Search bookings
- `POST /api/bookings/{id}/mark-paid` - Mark booking as paid
- `POST /api/bookings/{id}/cancel` - Cancel booking

### Orders
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create new order
- `GET /api/orders/{id}` - Get order by ID
- `GET /api/orders/search?customerName=Jane&paymentReference=AH-456` - Search orders
- `PUT /api/orders/{id}/status` - Update order status (Received, Preparing, Ready, Completed, Cancelled)
- `POST /api/orders/{id}/mark-paid` - Mark order as paid

## Payment Reference Format

Payment references are generated automatically as `AH-{timestamp}` for each booking and order.

Example: `AH-45234`

## Database Schema (Seeded Data)

### Services (5 services)
- Hair Wash & Blow Dry - R45, 45 mins
- Weave Installation - R150, 180 mins
- Manicure - R30, 60 mins
- Pedicure - R35, 60 mins
- Facial Treatment - R60, 75 mins

### Stylists (3 stylists)
- Zara Malik (Hair Specialist)
- Keisha Brown (Nails Specialist)
- Amara Jones (Facials Specialist)

### Café Items (5 items)
- Chocolate Cake Slice - R5
- Blueberry Muffin - R4
- Glazed Donut - R2.50
- Iced Coffee - R3.50
- Fresh Orange Juice - R4.50

## Configuration

Edit `appsettings.json` to configure:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=AnoitedHands;Trusted_Connection=true;"
  },
  "CompanySettings": {
    "Name": "Anointed Hands",
    "BankAccount": "YOUR_ACCOUNT_NUMBER",
    "BankName": "YOUR_BANK_NAME",
    "ContactEmail": "contact@anoitedhandsalon.com"
  }
}
```
