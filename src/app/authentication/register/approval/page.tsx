import type { Metadata } from "next";
import ApprovalClient from "./ApprovalClient";

export const metadata: Metadata = {
  title: "Awaiting Approval",
  robots: { index: false },
};

export default function ApprovalPage() {
  return <ApprovalClient />;
}
