import type { Metadata } from "next";
import AdminReportTicketsClient from "./AdminReportTicketsClient";

export const metadata: Metadata = { title: "Admin (Report Tickets)" };

export default function AdminReportTicketsPage() {
  return <AdminReportTicketsClient />;
}
