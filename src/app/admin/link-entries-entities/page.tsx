import type { Metadata } from "next";
import AdminLinkEntriesEntitiesClient from "./AdminLinkEntriesEntitiesClient";

export const metadata: Metadata = { title: "Admin (Links)" };

export default function AdminLinkEntriesEntitiesPage() {
  return <AdminLinkEntriesEntitiesClient />;
}
