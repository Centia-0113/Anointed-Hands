import React from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ChangePasswordForm } from "./ChangePasswordForm";

interface Props {
  children: React.ReactElement;
  /** When set, only users with this role may see the page. */
  role?: "Admin" | "Stylist" | "Customer";
}

/** Where each kind of user lands after signing in. */
export const homeFor = (role: string) => (role === "Admin" ? "/admin" : role === "Stylist" ? "/staff" : "/account");

/**
 * Guards a route. Signed-out visitors are sent to /login (and returned afterwards);
 * signed-in users without the required role see an access-denied message.
 * The API enforces the same rules, so this is a convenience, not the security boundary.
 */
export const RequireAuth: React.FC<Props> = ({ children, role }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p className="text-center py-24 text-blush-900/60">Checking your session…</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Staff given a temporary password by the admin must choose their own before going further
  if (user.mustChangePassword) {
    return (
      <div className="py-16 px-4">
        <div className="max-w-md mx-auto">
          <h1 className="text-4xl text-center">Welcome, {user.name.split(" ")[0]}!</h1>
          <div className="gold-rule mb-6" />
          <div className="card">
            <p className="mb-5 text-blush-900/80">
              You're signed in with the <strong>temporary password</strong> the salon gave you. Please choose your own
              password to continue – only you should know it.
            </p>
            <ChangePasswordForm />
          </div>
        </div>
      </div>
    );
  }

  // Client pages (e.g. My Bookings): staff go to their own area instead
  if (role === "Customer" && user.role !== "Customer") {
    return <Navigate to={homeFor(user.role)} replace />;
  }

  if (role && user.role !== role) {
    return (
      <div className="py-24 px-4">
        <div className="max-w-md mx-auto card text-center">
          <div className="text-5xl mb-3">🔒</div>
          <h1 className="text-3xl mb-2">{role === "Admin" ? "Admins only" : "Staff only"}</h1>
          <p className="text-blush-900/70 mb-6">
            This area is for salon staff.{" "}
            {user.role === "Customer" ? "You can view your own bookings and orders in your account." : ""}
          </p>
          <Link to={homeFor(user.role)} className="btn-primary">
            Go to {user.role === "Stylist" ? "My Schedule" : user.role === "Admin" ? "Dashboard" : "My Account"}
          </Link>
        </div>
      </div>
    );
  }

  return children;
};
