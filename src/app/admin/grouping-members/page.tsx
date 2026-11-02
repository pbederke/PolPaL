import type { Metadata } from "next";
import AdminGroupingMembersClient from "./AdminGroupingMembersClient";

export const metadata: Metadata = { title: "Admin (Grouping Members)" };

export default function AdminGroupingMembersPage() {
  return <AdminGroupingMembersClient />;
}
