import type { Metadata } from "next";
import AdminEntriesClient from "./AdminEntriesClient";

export const metadata: Metadata = { title: "Admin (Entries)" };

export default function AdminEntriesPage() {
  return <AdminEntriesClient />;
}
