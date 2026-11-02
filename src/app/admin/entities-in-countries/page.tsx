import type { Metadata } from "next";
import AdminEntitiesInCountriesClient from "./AdminEntitiesInCountriesClient";

export const metadata: Metadata = { title: "Admin (Entities in Countries)" };

export default function AdminEntitiesInCountriesPage() {
  return <AdminEntitiesInCountriesClient />;
}
