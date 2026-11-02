import type { Metadata } from "next";
import AdminUserActivitiesClient from "./AdminUserActivitiesClient";

export const metadata: Metadata = { title: "Admin (User Activities)" };

export default function AdminUserActivitiesPage() {
  return <AdminUserActivitiesClient />;
}
