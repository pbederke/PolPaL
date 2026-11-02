import type { Metadata } from "next";
import UserProfileClient from "./UserProfileClient";

export const metadata: Metadata = {
  title: "User Profile",
  description: "View and manage your user profile in the PolPaL database.",
  robots: { index: false },
};

export default function UserProfilePage() {
  return <UserProfileClient />;
}
