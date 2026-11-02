import type { Metadata } from "next";
import SessionExpiredClient from "./SessionExpiredClient";

export const metadata: Metadata = {
  title: "Session Expired",
  robots: { index: false },
};

export default function SessionExpiredPage() {
  return <SessionExpiredClient />;
}
