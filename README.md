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
- **Database**: SQLite by default (auto-created and seeded on first run); SQL Server optional
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
dotnet run
```
The SQLite database file `anointedhands.db` is created and seeded automatically.
To use SQL Server instead, set `"DatabaseProvider": "SqlServer"` in `appsettings.json`.
API runs on `http://localhost:5000`

### Frontend Setup
```bash
cd frontend
npm install
npm start
```
Frontend runs on `http://localhost:3000`

## 🔐 Accounts & Access

- **Customers** can register / sign in (`/login`) and see their own booking and café order history at `/account`.
  Guests can still book and order, but only bookings made while signed in appear in a history.
- **Admin dashboard** (`/admin`) and all admin API endpoints require the `Admin` role (JWT bearer token).
- Secrets live in .NET user-secrets (never in git). One-time setup in `backend/AnoitedHands.Api`:

```bash
dotnet user-secrets set "Jwt:Key" "<at least 32 random characters>"
dotnet user-secrets set "Admin:Email" "admin@anointedhands.co.za"
dotnet user-secrets set "Admin:Password" "<a strong password>"
```

The admin account is created on first start if none exists.

**Security features**
- Customers verify their email via an emailed link; once verified, guest bookings made with that email appear in their history.
- Forgot / reset password by emailed one-time link (expires in 1 hour).
- Change password from *My Account → Settings* (customers) or *Account settings* on the admin dashboard. Changing or resetting a password signs out all other sessions.
- Account lockout for 15 minutes after 5 failed sign-ins, plus a per-IP limit of 10 auth requests per minute.

**Sending email** - until SMTP is configured, emails (with their links) are printed in the API console. To send real email, e.g. with a Gmail app password:

```bash
dotnet user-secrets set "Smtp:Host" "smtp.gmail.com"
dotnet user-secrets set "Smtp:Username" "you@gmail.com"
dotnet user-secrets set "Smtp:Password" "<app password>"
dotnet user-secrets set "Smtp:From" "you@gmail.com"
```

**Opening hours** - bookings are only accepted Mon-Fri 9AM-6PM and Sat 10AM-5PM (closed Sundays), enforced by the API (`Services/OpeningHours.cs`), and the API rejects double-bookings.

> Schema changes: the database is created with `EnsureCreated`, which does not alter existing tables. After model changes in development, delete `anointedhands.db` and restart.

## ✨ More Features

- **Scan to Pay** - booking and order confirmations (and unpaid items in *My Bookings*) show a QR code with the amount and reference.
  Fill in `CompanySettings` (`BankName`, `AccountName`, `BankAccount`, `BranchCode`) in `appsettings.json`.
  Without a payment provider the QR contains the EFT details; with a SnapScan / Zapper / PayShap merchant link, set
  `CompanySettings:ScanToPayUrl` using `{reference}`, `{amount}` or `{amountCents}` placeholders and the QR opens the payment app.
- **Gallery** (`/gallery`) - admin uploads photos (JPG/PNG/WebP, 5 MB max) under *Admin → Gallery*; stored in `wwwroot/uploads/gallery`.
- **Reviews** (`/reviews`) - signed-in clients rate 1-5 stars overall or per service; "Verified client" when they have a paid booking. Admin can hide/delete.
- **Help & lost property** (`/help`) - anyone can report a concern or lost item and gets a reference number; the admin is emailed,
  responds under *Admin → Concerns & Lost Items*, and the client is emailed each update (signed-in clients also see status on the page).
- **In-salon cafe ordering** - `/order` only works with the salon code. Print the QR sign from *Admin → Cafe QR*; scanning it unlocks
  ordering for that browser tab for 4 hours. *Change Code* invalidates old signs.
- **Facials** include eyebrow shaping, brow tint & shape, classic lash extensions and lash lift & tint.

## 💳 Automatic Payment Confirmation (*Back Office → Payments*)

- **PayFast** - enter your merchant ID, merchant key and passphrase (stored in the database, never returned to the browser) and
  tick *Accept payments with PayFast*. Clients pay deposits, balances and cafe orders via `/pay/<reference>` (also what the
  scan-to-pay QR opens). PayFast's ITN posts to `/api/payments/payfast/notify`; the API checks the signature, the merchant id,
  that the request came from PayFast's servers and that PayFast confirms it, then marks the booking/order paid. Repeated
  notifications are ignored. **The API must be reachable on a public HTTPS address** for PayFast to send notifications - set it
  under *Booking system (API) address*. Use *Test mode* with your PayFast sandbox account first.
- **Bank statement upload** - for normal EFTs: upload your bank's CSV statement, review the preview, then *Apply*. References are
  found anywhere on a line (`AH-B12345`, `ahb12345`, `AH B12345`), the credit/amount column is used (not the balance), and
  re-uploading a statement never counts a payment twice.
- Payment references are unique per booking/order so they can be matched safely.

## 🗂️ Site Structure

| Area | Who | What |
|------|-----|------|
| Public website (`/`, `/services`, `/gallery`, `/cafe`, `/reviews`, `/help`) | Everyone | Browse, read reviews, report concerns |
| `/booking`, `/order`, `/account` | Clients (and guests for booking) | Book, order in the salon, see history, write reviews |
| `/staff` | Stylists | Their own schedule and clients |
| `/admin/*` - **Back Office** | Admin | Run the business: bookings & payments, orders, services & prices, staff, hours, website content, gallery, reviews, reports |

Admin and staff accounts **cannot book, order or write reviews** (blocked by the API, hidden on the site); the admin's job is
managing operations.

### Editing the website without code (*Back Office → Website Content*)
Business name & tagline, contact details, address, WhatsApp / Instagram / Facebook, homepage heading, introduction and
"About us", an announcement banner, bank details for scan-to-pay, the deposit % and deadline, and the cancellation policy.
Weekly opening hours are under *Back Office → Opening Hours*. Changes go live as soon as they're saved.
`CompanySettings` in `appsettings.json` is only used to pre-fill these on first run.

## 🧾 Management, Deposits & Staff

- **Services & Menu** (*Admin → Services & Menu*) - add, edit and hide services and cafe items, change prices and durations,
  mark items out of stock, and set a discount (% off, optional end date). Discounted prices show crossed out on the site;
  bookings and orders are charged the discounted price, and existing bookings keep the price they were booked at.
- **Opening hours** (*Admin → Opening Hours*) - open a Sunday with custom hours, close a day (e.g. public holiday) or change one
  day's hours. Days with active bookings can't be closed.
- **Refundable deposit** (default 10%, due within 24 hours - both editable in Website Content) - every booking starts as
  *Awaiting Deposit*: the deposit is rounded up to the rand and due by the deadline (or before the appointment if sooner), with a scan-to-pay QR. A background job releases unpaid bookings (*Expired*) every
  5 minutes and emails the client. The admin marks *Deposit Paid* / *Paid in Full*; cancelling after payment marks a *Refund Due*,
  then *Mark Refunded*. The balance is paid at the appointment (scan-to-pay available in *My Bookings*).
- **Staff** (*Admin → Staff*) - only the admin can add employees and create their logins (public sign-up only creates client
  accounts). *Add Employee* creates the profile and login in one step with a temporary password; the admin hands over the
  details, and the employee must choose their own password at first sign-in before they can see any client data (enforced by
  the API). *Reset password* issues a new temporary password and signs them out everywhere. Stylists sign in to **My Schedule** (`/staff`) to see only
  their own appointments (client phone, email, notes, payment status), mark visits *Completed* / *No Show*, and browse
  **My Clients** with visit history, next appointment and total spent.

> Appointment times and deposit deadlines use the server's local time zone - run the API in South African time (SAST).

## 🌐 API Endpoints

### Auth
- `POST /api/auth/register` - Create customer account
- `POST /api/auth/login` - Sign in (returns JWT)
- `GET /api/auth/me` - Current user
- `POST /api/auth/change-password` - Change password (signed in)
- `POST /api/auth/verify-email` / `resend-verification` - Email verification
- `POST /api/auth/forgot-password` / `reset-password` - Password reset

### Core Resources
- `GET /api/services` - All services
- `GET /api/cafeitems` - All café items
- `GET /api/stylists` - All stylists

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - Get all bookings (admin)
- `GET /api/bookings/mine` - Signed-in customer's bookings
- `GET /api/bookings/available-slots` - Available time slots
- `POST /api/bookings/{id}/mark-paid` - Mark booking paid

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - Get all orders (admin)
- `GET /api/orders/mine` - Signed-in customer's orders
- `PUT /api/orders/{id}/status` - Update order status
- `POST /api/orders/{id}/mark-paid` - Mark order paid

## 💳 Payment Flow

1. Customer books service or places order
2. System generates unique payment reference (e.g., `AH-45234`)
3. Customer pays via EFT using that reference
4. Admin checks bank, finds payment, clicks "Mark Paid"
5. System updates payment status and notifies customer

## 🎨 Design

- **Color Scheme**: Blush & rose pinks with warm gold accents (`blush-*` and `gold-*` in `tailwind.config.js`)
- **Typography**: Cormorant Garamond headings, Lato body text
- **Currency**: South African Rand (R)
- **Components**: Card-based layout with smooth transitions
- **Responsive**: Mobile-first design with Tailwind CSS

## 📦 Seeded Data

The API comes pre-seeded with:

**Services**: 6 services (Hair, Nails, Facials)
**Stylists**: 3 stylists with specializations
**Café Items**: 7 café items (Cakes, Muffins, Donuts, Drinks)

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
