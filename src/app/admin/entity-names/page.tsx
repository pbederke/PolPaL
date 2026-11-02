import type { Metadata } from "next";
import AdminEntityNamesClient from "./AdminEntityNamesClient";

export const metadata: Metadata = { title: "Admin (Entity Names)" };

export default function AdminEntityNamesPage() {
  return <AdminEntityNamesClient />;
}
