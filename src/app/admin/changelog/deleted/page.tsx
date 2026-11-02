import type { Metadata } from "next";
import AdminChangelogSectionClient from "../AdminChangelogSectionClient";

export const metadata: Metadata = { title: "Changelog – Deleted" };

export default function AdminChangelogDeletedPage() {
  return <AdminChangelogSectionClient action="deleted" />;
}
