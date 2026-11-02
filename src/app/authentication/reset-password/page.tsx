import { Suspense } from "react";
import type { Metadata } from "next";
import ResetPasswordClient from "./ResetPasswordClient";

export const metadata: Metadata = {
  title: "Reset Password",
  robots: { index: false },
};

export default function ResetPasswordPage() {

  return (
    <Suspense fallback={<div>Loading client...</div>}>
      <ResetPasswordClient />
    </Suspense>
  );
}
