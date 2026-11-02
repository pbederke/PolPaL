import { Suspense } from "react";
import type { Metadata } from "next";
import ForgotPasswordClient from "./ForgotPasswordClient";

export const metadata: Metadata = {
  title: "Forgot Password",
};

export default function ForgotPasswordPage() {

  return (
    <Suspense fallback={<div>Loading client...</div>}>
      <ForgotPasswordClient />
    </Suspense>
  );
}
