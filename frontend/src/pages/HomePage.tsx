import React from "react";

export const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-purple-900">
            Welcome to Anointed Hands
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            Premium salon and café services in one elegant space. Book your appointment, order delicious treats, and experience beauty and wellness like never before.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <a href="/services" className="btn-primary text-lg px-8 py-4">
              View Services
            </a>
            <a href="/booking" className="btn-secondary text-lg px-8 py-4">
              Book Now
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white bg-opacity-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Why Choose Us</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="text-5xl mb-4">✨</div>
              <h3 className="text-2xl font-bold mb-3">Professional Services</h3>
              <p className="text-gray-600">
                Experienced stylists offering hair, nails, and facial services
              </p>
            </div>
            <div className="card text-center">
              <div className="text-5xl mb-4">☕</div>
              <h3 className="text-2xl font-bold mb-3">Café & Refreshments</h3>
              <p className="text-gray-600">
                Enjoy delicious cakes, pastries, and beverages while you wait
              </p>
            </div>
            <div className="card text-center">
              <div className="text-5xl mb-4">🛡️</div>
              <h3 className="text-2xl font-bold mb-3">Easy Payments</h3>
              <p className="text-gray-600">
                Secure EFT payments with convenient booking and ordering
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto card text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Treat Yourself?</h2>
          <p className="text-lg text-gray-600 mb-8">
            Book an appointment today and experience the Anointed Hands difference
          </p>
          <a href="/booking" className="btn-primary text-lg px-8 py-4">
            Book Your Appointment
          </a>
        </div>
      </section>
    </div>
  );
};
