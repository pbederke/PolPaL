import { Suspense } from "react";
import type { Metadata } from "next";
import RegisterClient from "./RegisterClient";

export const metadata: Metadata = {
  title: "Register",
};

export default function RegisterPage() {

  return (
    <Suspense fallback={<div>Loading client...</div>}>
      <RegisterClient />
    </Suspense>
  );
}
