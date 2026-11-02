import type { Metadata } from "next";
import AdminValidationClient from "./AdminValidationClient";

export const metadata: Metadata = { title: "Admin (Validation Links)" };

export default function AdminValidationPage() {
  return <AdminValidationClient />;
}
