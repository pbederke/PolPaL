import type { Metadata } from "next";
import AdminVersionsClient from "./AdminVersionsClient";

export const metadata: Metadata = { title: "Admin (Versions)" };

export default function AdminVersionsPage() {
  return <AdminVersionsClient />;
}
