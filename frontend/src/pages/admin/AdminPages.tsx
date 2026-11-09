import React from "react";
import { AdminPageHeader } from "../../components/AdminLayout";
import { AdminCatalog, AdminHours, AdminStaff } from "../../components/AdminManage";
import { AdminGallery, AdminReports, AdminReviews, AdminSalonQr } from "../../components/AdminPanels";
import { WeeklyHoursEditor } from "./AdminContentPage";

/** Thin page wrappers giving each back-office section its own title. */

export const AdminServicesPage: React.FC = () => (
  <>
    <AdminPageHeader title="Services & Menu" subtitle="Add services and café items, change prices, set discounts and stock." />
    <AdminCatalog />
  </>
);

export const AdminStaffPage: React.FC = () => (
  <>
    <AdminPageHeader title="Staff" subtitle="Add employees and give them a login with a temporary password." />
    <AdminStaff />
  </>
);

export const AdminHoursPage: React.FC = () => (
  <div className="space-y-8 max-w-5xl">
    <AdminPageHeader title="Opening Hours" subtitle="Set your weekly hours, open on a Sunday, or close for a holiday." />
    <WeeklyHoursEditor />
    <AdminHours />
  </div>
);

export const AdminReportsPage: React.FC = () => (
  <>
    <AdminPageHeader title="Concerns & Lost Items" subtitle="Respond to client reports – they're emailed each update." />
    <AdminReports />
  </>
);

export const AdminReviewsPage: React.FC = () => (
  <>
    <AdminPageHeader title="Reviews" subtitle="Publish or hide client reviews." />
    <AdminReviews />
  </>
);

export const AdminGalleryPage: React.FC = () => (
  <>
    <AdminPageHeader title="Gallery" subtitle="Upload photos of your work for the public gallery." />
    <AdminGallery />
  </>
);

export const AdminCafeQrPage: React.FC = () => (
  <>
    <AdminPageHeader title="Café QR Code" subtitle="Print the table sign that lets clients in the salon order from the café." />
    <AdminSalonQr />
  </>
);
