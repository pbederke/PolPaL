import type { Metadata } from "next";
import AdminEntitiesClient from "./AdminEntitiesClient";

export const metadata: Metadata = {
  title: "Admin (Entities)",
};

export default function AdminEntitiesPage() {
  return <AdminEntitiesClient />;
}
