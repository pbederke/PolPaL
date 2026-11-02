import type { Metadata } from "next";
import AdminEntityChangesClient from "./AdminEntityChangesClient";

export const metadata: Metadata = { title: "Admin (Entity Changes)" };

export default function AdminEntityChangesPage() {
  return <AdminEntityChangesClient />;
}
