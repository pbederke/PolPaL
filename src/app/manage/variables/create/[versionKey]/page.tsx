import { Suspense } from "react";
import type { Metadata } from "next";
import CreateVariableClient from "./CreateVariableClient";

export const metadata: Metadata = {
  title: "Add Variable Information",
  description: "Add new variable information to the PolPaL database.",
  robots: { index: false },
};

export default function CreateVariablePage() {
  return (
    <Suspense fallback={<div>Loading client...</div>}>
      <CreateVariableClient />
    </Suspense>
  );
}
