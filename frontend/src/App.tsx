import React from "react";
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

// Styles
import "./styles/global.css";

function App() {
  return (
    <Router>
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
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </main>
        <Footer />
      </div>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#2d1b4e",
            color: "#fff",
          },
        }}
      />
    </Router>
  );
}

export default App;
