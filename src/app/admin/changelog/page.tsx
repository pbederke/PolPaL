import type { Metadata } from "next";
import AdminChangelogClient from "./AdminChangelogClient";

export const metadata: Metadata = {
  title: "Changelog",
};

export default function AdminChangelogPage() {
  return <AdminChangelogClient />;
}
