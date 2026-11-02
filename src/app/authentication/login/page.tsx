import { Suspense } from "react";
import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {

  return (
    <Suspense fallback={<div>Loading client...</div>}>
      <LoginClient />
    </Suspense>
  );
}
