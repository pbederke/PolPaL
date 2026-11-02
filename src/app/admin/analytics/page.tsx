import type { Metadata } from "next";
import AdminAnalyticsClient from "./AdminAnalyticsClient";

export const metadata: Metadata = { title: "Admin (Download Analytics)" };

export default function AdminAnalyticsPage() {
  return <AdminAnalyticsClient />;
}
