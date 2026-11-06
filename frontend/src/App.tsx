import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

// Layout
import { Header, Footer } from "./components/Layout";

// Pages
import { HomePage } from "./pages/HomePage";
import { ServicesPage } from "./pages/ServicesPage";
import { CafePage } from "./pages/CafePage";
import { BookingPage } from "./pages/BookingPage";
import { OrderPage } from "./pages/OrderPage";
import { AdminDashboard } from "./pages/AdminDashboard";
import { LoginPage } from "./pages/LoginPage";
import { AccountPage } from "./pages/AccountPage";
import { ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage } from "./pages/PasswordPages";

// Auth
import { AuthProvider } from "./context/AuthContext";
import { RequireAuth } from "./components/RequireAuth";

// Styles
import "./styles/global.css";

function App() {
  return (
    <Router>
      <AuthProvider>
      <div className="flex flex-col min-h-screen">
        <Header
          title="Anointed Hands"
          logoUrl="/assets/images/logo.png"
        />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/cafe" element={<CafePage />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/order" element={<OrderPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route
              path="/account"
              element={
                <RequireAuth>
                  <AccountPage />
                </RequireAuth>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireAuth role="Admin">
                  <AdminDashboard />
                </RequireAuth>
              }
            />
          </Routes>
        </main>
        <Footer />
      </div>
      </AuthProvider>
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
