import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { homeFor } from "./RequireAuth";

/**
 * Booking, café ordering and reviews are for clients. Admin and staff accounts manage the salon
 * instead, so they see a short note with a link back to their own area.
 */
export const ClientsOnly: React.FC<{ children: React.ReactElement; what: string }> = ({ children, what }) => {
  const { user } = useAuth();
  if (!user || user.role === "Customer") return children;

  return (
    <div className="py-24 px-4">
      <div className="max-w-md mx-auto card text-center">
        <div className="text-5xl mb-3">💼</div>
        <h1 className="text-3xl mb-2">For clients</h1>
        <p className="text-blush-900/70 mb-6">
          {what} is for clients. You're signed in as {user.role === "Admin" ? "the admin" : "staff"}
          {user.role === "Admin" ? " – manage bookings, orders and the website from the back office." : " – your appointments are in My Schedule."}
        </p>
        <Link to={homeFor(user.role)} className="btn-primary">
          {user.role === "Admin" ? "Go to Back Office" : "Go to My Schedule"}
        </Link>
      </div>
    </div>
  );
};
