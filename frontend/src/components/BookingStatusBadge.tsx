import React from "react";
import { Booking } from "../types";

/** Colour-coded booking status, e.g. "Awaiting deposit", "Confirmed", "Completed". */
export const BookingStatusBadge: React.FC<{ booking: Booking; dark?: boolean }> = ({ booking: b }) => {
  switch (b.status) {
    case "Awaiting Deposit":
      return <span className="badge-pending">Awaiting deposit</span>;
    case "Confirmed":
      return <span className="badge-paid">{b.isPaid ? "Paid in full" : "Confirmed"}</span>;
    case "Completed":
      return <span className="badge-info">Completed</span>;
    case "No Show":
      return <span className="badge-cancelled">No show</span>;
    case "Expired":
      return <span className="badge-cancelled">Released – no deposit</span>;
    case "Cancelled":
      return <span className="badge-cancelled">Cancelled</span>;
    default:
      return <span className="badge">{b.status}</span>;
  }
};
