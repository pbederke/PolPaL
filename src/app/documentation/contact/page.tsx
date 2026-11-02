import type { Metadata } from "next";
import ContactClient from "./ContactClient";

export const metadata: Metadata = {
  title: "Contact",
  description: "PolPaL contact information and support.",
  alternates: {
    canonical: "/documentation/contact",
  },
};

export default function ContactPage() {
  return <ContactClient />;
}
