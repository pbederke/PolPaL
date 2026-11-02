import type { Metadata } from "next";
import AdminDatasetsClient from "./AdminDatasetsClient";

export const metadata: Metadata = { title: "Admin (Datasets)" };

export default function AdminDatasetsPage() {
  return <AdminDatasetsClient />;
}
