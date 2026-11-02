import type { Metadata } from "next";
import AdminNewsClient from "./AdminNewsClient";

export const metadata: Metadata = {
  title: "Admin (News)",
};

export default function AdminNewsPage() {
  return <AdminNewsClient />;
}
