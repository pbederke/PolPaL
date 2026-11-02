import type { Metadata } from "next";
import AdminUsersClient from "./AdminUsersClient";

export const metadata: Metadata = {
  title: "Admin (Users)",
};

export default function AdminUsersPage() {
  return <AdminUsersClient />;
}
