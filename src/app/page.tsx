import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: { absolute: "PolPaL" },
  description: "PolPaL (Political Party Links) is a linkage key database for political entities across social science datasets, built on the core party list of Party Facts.",
  alternates: {
    canonical: "/",
  },
};

export default function HomePage() {
  return <HomeClient />;
}
