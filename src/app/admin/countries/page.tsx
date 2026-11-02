import type { Metadata } from "next";
import AdminCountriesClient from "./AdminCountriesClient";

export const metadata: Metadata = {
  title: "Admin (Countries)",
};

export default function AdminCountriesPage() {
  return <AdminCountriesClient />;
}
