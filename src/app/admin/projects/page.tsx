import type { Metadata } from "next";
import AdminProjectsClient from "./AdminProjectsClient";

export const metadata: Metadata = { title: "Admin (Projects)" };

export default function AdminProjectsPage() {
  return <AdminProjectsClient />;
}
