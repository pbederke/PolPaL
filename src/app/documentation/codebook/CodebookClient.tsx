"use client";

import { BookOpen, Download } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

const documents = [
    {
        title: "PolPaL Codebook",
        description: "The codebook provides detailed documentation of all variables, entity types, and the data structure used in the PolPaL database.",
        src: "/documents/PolPaL_Codebook.pdf",
    },
    {
        title: "PolPaL Data Model",
        description: "This document describes the data model used in the PolPaL project.",
        src: "/documents/PolPaL_DataModel.pdf",
    },
    {
        title: "PolPaL - Merging Data with PolPaL",
        description: "This document describes how PolPaL can be used to merge data from different sources.",
        src: "/documents/PolPaL_MergingDataWithPolPaL.pdf",
    },
    {
        title: "PolPaL Data Import",
        description: "This document describes the data import processes and workflows for integrating external datasets into PolPaL.",
        src: "/documents/PolPaL_DataImport.pdf",
    },
    {
        title: "PolPaL Migration Strategy",
        description: "This document describes the migration strategy for building on the Party Facts project.",
        src: "/documents/PolPaL_MigrationStrategy.pdf",
    },
    {
        title: "PolPaL Processes",
        description: "This document describes the data integration processes and workflows used in the PolPaL project.",
        src: "/documents/PolPaL_Processes.pdf",
    },
    {
        title: "PolPaL Web Application",
        description: "This document describes the technical infrastructure of the PolPaL web application.",
        src: "/documents/PolPaL_WebApplication.pdf",
    },
];

export default function CodebookClient() {
    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

            {/* Breadcrumbs */}
            <Breadcrumbs items={[
                { label: "Home", href: "/" },
                { label: "Documentation" },
                { label: "Codebook & Documents" },
            ]} />

            {/* Hero */}
            <section className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
                <h1 className="text-2xl font-bold mb-3 text-primary">Codebook & Documents</h1>
                <p className="text-gray-700 text-justify">
                    Here you can find the PolPaL codebook and additional documentation.
                    The codebook describes all variables, entity types, and the data structure used in the PolPaL database.
                    Additional documents describe our processes and workflows.
                </p>
            </section>

            {/* Documents */}
            <section className="bg-white rounded-xl shadow-md border border-gray-200 p-8 space-y-6">
                <div>
                    <h2 className="text-xl font-bold text-primary mb-1">Documents</h2>
                    <p className="text-gray-600 text-sm text-justify">
                        Browse or download the documents below. You can view them directly in your browser or download them for offline use.
                    </p>
                </div>

                {documents.map((doc) => (
                    <div key={doc.src} className="rounded-lg border border-gray-200 bg-gray-50 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <BookOpen className="h-5 w-5 text-primary" />
                            <h3 className="text-lg font-semibold text-gray-900">{doc.title}</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            {doc.description}
                        </p>
                        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                            <iframe
                                src={doc.src}
                                title={doc.title}
                                className="w-full h-[600px]"
                            />
                        </div>
                        <a
                            href={doc.src}
                            download
                            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                        >
                            <Download className="h-4 w-4" />
                            Download {doc.title} (PDF)
                        </a>
                    </div>
                ))}
            </section>
        </main>
    );
}
