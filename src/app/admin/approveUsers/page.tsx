import type { Metadata } from "next";
import AdminApproveUsersClient from "./AdminApproveUsersClient";

export const metadata: Metadata = {
  title: "Admin (Approve Users)",
};

export default function AdminApproveUsersPage() {
  return <AdminApproveUsersClient />;
}
