import { Suspense } from "react";
import type { Metadata } from "next";
import UpdateNewsClient from "./UpdateNewsClient";

export async function generateMetadata({ params }: { params: Promise<{ newsId: string }> }): Promise<Metadata> {
  const { newsId } = await params;
  return { 
    title: `Update News ${newsId}`,
    description: `Update the news entry ${newsId} in the PolPaL database.`,
    robots: { index: false },
  };
}

export default function UpdateNewsPage() {

  return (
    <Suspense fallback={<div>Loading client...</div>}>
      <UpdateNewsClient />
    </Suspense>
  );
}
