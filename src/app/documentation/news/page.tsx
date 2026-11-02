import type { Metadata } from "next";
import NewsClient from "./NewsClient";

export const metadata: Metadata = {
  title: "News",
  description: "Latest news and updates from PolPaL.",
  alternates: {
    canonical: "/documentation/news",
  },
};

export default function NewsPage() {
  return <NewsClient />;
}
