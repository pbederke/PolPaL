import type { Metadata } from "next";
import AdminReferencesClient from "./AdminReferencesClient";

export const metadata: Metadata = {
  title: "Admin (References)",
};

export default function AdminReferencesPage() {
  return <AdminReferencesClient />;
}
