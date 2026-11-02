import type { Metadata } from "next";
import CommentedEntitiesClient from "./CommentedEntitiesClient";

export const metadata: Metadata = {
  title: "Commented Entities",
  description: "Browse all PolPaL entities that have comments.",
  robots: { index: false },
};

export default function CommentedEntitiesPage() {
  return <CommentedEntitiesClient />;
}
