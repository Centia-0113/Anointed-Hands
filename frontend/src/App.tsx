import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

// Layouts
import { PublicLayout } from "./components/Layout";
import { AdminLayout } from "./components/AdminLayout";

// Public website
import { HomePage } from "./pages/HomePage";
import { ServicesPage } from "./pages/ServicesPage";
import { GalleryPage } from "./pages/GalleryPage";
import { CafePage } from "./pages/CafePage";
import { ReviewsPage } from "./pages/ReviewsPage";
import { HelpPage } from "./pages/HelpPage";

// Client actions & accounts
import { BookingPage } from "./pages/BookingPage";
import { OrderPage } from "./pages/OrderPage";
import { LoginPage } from "./pages/LoginPage";
import { AccountPage } from "./pages/AccountPage";
import { ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage } from "./pages/PasswordPages";

// Staff
import { StaffPage } from "./pages/StaffPage";

// Back office (admin)
import { AdminOperations } from "./pages/AdminDashboard";
import { AdminAccountPage, AdminContentPage } from "./pages/admin/AdminContentPage";
import {
  AdminCafeQrPage,
  AdminGalleryPage,
  AdminHoursPage,
  AdminReportsPage,
  AdminReviewsPage,
  AdminServicesPage,
  AdminStaffPage,
} from "./pages/admin/AdminPages";

// Context & guards
import { AuthProvider } from "./context/AuthContext";
import { SiteProvider } from "./context/SiteContext";
import { RequireAuth } from "./components/RequireAuth";
import { ClientsOnly } from "./components/ClientsOnly";

import "./styles/global.css";

function App() {
  return (
    <Router>
      <SiteProvider>
        <AuthProvider>
          <Routes>
            {/* Public website, client accounts and the staff schedule */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/gallery" element={<GalleryPage />} />
              <Route path="/cafe" element={<CafePage />} />
              <Route path="/reviews" element={<ReviewsPage />} />
              <Route path="/help" element={<HelpPage />} />

              <Route path="/booking" element={<ClientsOnly what="Booking appointments"><BookingPage /></ClientsOnly>} />
              <Route path="/order" element={<ClientsOnly what="Ordering from the café"><OrderPage /></ClientsOnly>} />

              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route
                path="/account"
                element={
                  <RequireAuth role="Customer">
                    <AccountPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/staff"
                element={
                  <RequireAuth role="Stylist">
                    <StaffPage />
                  </RequireAuth>
                }
              />
            </Route>

            {/* Back office: managing the business without touching code */}
            <Route
              path="/admin"
              element={
                <RequireAuth role="Admin">
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route index element={<AdminOperations view="overview" />} />
              <Route path="bookings" element={<AdminOperations view="bookings" />} />
              <Route path="orders" element={<AdminOperations view="orders" />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="services" element={<AdminServicesPage />} />
              <Route path="staff" element={<AdminStaffPage />} />
              <Route path="hours" element={<AdminHoursPage />} />
              <Route path="cafe-qr" element={<AdminCafeQrPage />} />
              <Route path="content" element={<AdminContentPage />} />
              <Route path="gallery" element={<AdminGalleryPage />} />
              <Route path="reviews" element={<AdminReviewsPage />} />
              <Route path="account" element={<AdminAccountPage />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </SiteProvider>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#4a0d29",
            color: "#fff",
            border: "1px solid #c9a227",
          },
          iconTheme: { primary: "#c9a227", secondary: "#4a0d29" },
        }}
      />
    </Router>
  );
}

export default App;
