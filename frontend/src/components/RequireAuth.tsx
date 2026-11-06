import React from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface Props {
  children: React.ReactElement;
  /** When set, only users with this role may see the page. */
  role?: "Admin" | "Stylist";
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
