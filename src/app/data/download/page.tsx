import type { Metadata } from "next";
import DownloadClient from "./DownloadClient";

export const metadata: Metadata = {
  title: "Downloads",
  description: "Download PolPaL linkage data for use in your research.",
  alternates: {
    canonical: "/data/download",
  },
};

export default function DownloadPage() {
  return <DownloadClient />;
}
