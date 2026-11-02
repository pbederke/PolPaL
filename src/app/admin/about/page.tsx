import type { Metadata } from "next";
import AdminAboutClient from "./AdminAboutClient";

export const metadata: Metadata = { title: "Admin (About)" };

export default function AdminAboutPage() {
  return <AdminAboutClient />;
}
