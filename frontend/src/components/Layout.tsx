import React from "react";

interface HeaderProps {
  logoUrl?: string;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({
  logoUrl = "/assets/images/logo.png",
  title = "Anointed Hands",
}) => {
  return (
    <header className="bg-white shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {logoUrl && (
            <img
              src={logoUrl}
              alt={title}
              className="h-12 w-12 rounded-lg object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          )}
          <h1 className="text-2xl font-bold salon-primary">{title}</h1>
        </div>
        <nav className="hidden md:flex space-x-1">
          <a href="/" className="nav-link">
            Home
          </a>
          <a href="/services" className="nav-link">
            Services
          </a>
          <a href="/booking" className="nav-link">
            Book Now
          </a>
          <a href="/order" className="nav-link">
            Order
          </a>
          <a href="/admin" className="nav-link">
            Admin
          </a>
        </nav>
      </nav>
    </header>
  );
};

export const Footer: React.FC = () => {
  return (
    <footer className="bg-purple-900 text-white py-8 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Anointed Hands</h3>
            <p className="text-purple-200">
              Premium salon and café services for your beauty and wellness needs.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Hours</h3>
            <p className="text-purple-200">Mon - Fri: 9AM - 6PM</p>
            <p className="text-purple-200">Sat: 10AM - 5PM</p>
            <p className="text-purple-200">Sun: Closed</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <p className="text-purple-200">Email: contact@anoitedhandsalon.com</p>
            <p className="text-purple-200">Phone: +1 (555) 123-4567</p>
          </div>
        </div>
        <hr className="border-purple-700 my-8" />
        <p className="text-center text-purple-200">
          © 2024 Anointed Hands. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
