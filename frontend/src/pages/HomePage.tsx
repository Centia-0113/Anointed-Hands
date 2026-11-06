import React from "react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: "✨",
    title: "Professional Services",
    text: "Experienced stylists offering hair, nails and facial treatments.",
  },
  {
    icon: "☕",
    title: "Café & Refreshments",
    text: "Enjoy cakes, pastries and beverages while you're pampered.",
  },
  {
    icon: "💳",
    title: "Easy Payments",
    text: "Simple EFT payments with a unique reference for every booking.",
  },
];

export const HomePage: React.FC = () => {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-28 px-4">
        <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-blush-200/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-gold-200/60 blur-3xl" />

        <div className="relative max-w-4xl mx-auto text-center">
          <p className="uppercase tracking-[0.35em] text-xs font-bold text-gold-600 mb-4">
            Salon · Spa · Café
          </p>
          <h1 className="text-5xl md:text-7xl mb-2 text-blush-800">
            Welcome to <span className="text-gold-gradient">Anointed Hands</span>
          </h1>
          <div className="gold-rule" />
          <p className="text-lg md:text-xl text-blush-900/70 mb-10 max-w-2xl mx-auto">
            Premium salon and café services in one elegant space. Book your appointment,
            order delicious treats, and experience beauty and wellness like never before.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/booking" className="btn-primary text-lg px-8 py-3.5">
              Book an Appointment
            </Link>
            <Link to="/services" className="btn-secondary text-lg px-8 py-3.5">
              View Services
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-white/60 border-y border-gold-100">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl text-center">Why Choose Us</h2>
          <div className="gold-rule mb-12" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((f) => (
              <div key={f.title} className="card card-hover text-center">
                <div className="mx-auto mb-5 h-16 w-16 rounded-full flex items-center justify-center text-3xl bg-gradient-to-br from-blush-100 to-gold-100 ring-1 ring-gold-300">
                  {f.icon}
                </div>
                <h3 className="text-2xl mb-2">{f.title}</h3>
                <p className="text-blush-900/70">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto rounded-3xl p-10 md:p-14 text-center text-white shadow-soft bg-gradient-to-br from-blush-500 via-blush-600 to-blush-800 ring-1 ring-gold-400">
          <h2 className="text-4xl mb-3 text-white">Ready to Treat Yourself?</h2>
          <p className="text-lg text-blush-100 mb-8">
            Book today and experience the Anointed Hands difference.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/booking" className="btn-gold text-lg px-8 py-3.5">
              Book Your Appointment
            </Link>
            <Link
              to="/cafe"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-full font-bold border-2 border-gold-300 text-white hover:bg-white/10 transition-all text-lg"
            >
              See the Café Menu
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
