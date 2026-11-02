import type { Metadata } from "next";
import AboutClient from "./AboutClient";

export const metadata: Metadata = {
  title: "About",
  description: "About the PolPaL project, its team, and its relation to Party Facts and MEDem.",
  alternates: {
    canonical: "/documentation/about",
  },
};

export default function AboutPage() {
  return <AboutClient />;
}
