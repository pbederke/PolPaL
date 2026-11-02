"use client";

import { Link2, CheckCircle, BookOpen, GitMerge, Users, LockOpen, Download } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

const contributorAreas = [
    { icon: Link2, label: "Linking", description: "Link external dataset entries to PolPaL entities" },
    { icon: CheckCircle, label: "Validation", description: "Validate links between external dataset entries and PolPaL entities" },
    { icon: BookOpen, label: "Historical names", description: "Add historical entity names" },
    { icon: GitMerge, label: "Party changes", description: "Document predecessor/successor relationships between parties" },
    { icon: Users, label: "Grouping memberships", description: "Record grouping memberships of entities" },
    { icon: LockOpen, label: "Access", description: "Gain access to work-in-progress datasets" },
];

export default function TutorialsClient() {
    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

            {/* Breadcrumbs */}
            <Breadcrumbs items={[
                { label: "Home", href: "/" },
                { label: "Documentation" },
                { label: "Tutorials" },
            ]} />

            {/* Hero */}
            <section className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
                <h1 className="text-2xl font-bold mb-3 text-primary">Tutorials for PolPaL</h1>
                <p className="text-gray-700 text-justify">
                    Welcome to the PolPaL tutorials page.
                    Here you will find guidance and tutorials on how to contribute to the PolPaL database.
                    Follow the steps outlined below to get started and make contributions to the PolPaL database and broader research community.
                    Depending on your assigned role, you can contribute different types of data, including linking external dataset entries to PolPaL entities, validating existing linkages, and curating PolPaL entity information.
                </p>

            </section>

            {/* === TRACK 1: Individual Researcher === */}
            <section className="bg-white rounded-xl shadow-md border border-gray-200 p-8 space-y-4">
                <div>
                    <h2 className="text-xl font-bold text-primary mb-1">Role as a registered User</h2>
                    <p className="text-gray-600 text-sm text-justify">
                        The registered User track is for individual researchers who want to be a part of the PolPaL community and curate the linkages in the PolPaL database.
                        As a registered User, you can validate existing linkages between external dataset entries and PolPaL entities, and gain access to work-in-progress datasets.
                        You help to improve the quality of the data in PolPaL and contribute to the broader research community.
                    </p>
                    <p className="text-gray-600 text-sm text-justify mt-2">
                        Please find below the steps to validate existing linkages in the PolPaL database. If you have any questions or need assistance, please contact the PolPaL team.
                    </p>
                </div>

                {/* Role: User */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
                    <p className="font-semibold text-gray-900 mb-1">As a <span className="text-primary">User</span></p>
                    <p className="text-sm text-gray-600 mb-3 text-justify">
                        Users can help improve data quality by validating existing linkages:
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3">
                        <div className="flex gap-3 items-start">
                            <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                            <span>
                                <span className="font-medium text-gray-900 text-sm">Validation</span>
                                <span className="text-gray-500 text-sm"> — Validate links between external dataset entries and PolPaL entities</span>
                            </span>
                        </div>
                        <div className="flex gap-3 items-start">
                            <LockOpen className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                            <span>
                                <span className="font-medium text-gray-900 text-sm">Access</span>
                                <span className="text-gray-500 text-sm"> — Gain access to work-in-progress datasets</span>
                            </span>
                        </div>
                    </div>
                </div>

            </section>

            {/* === TRACK 2: Contributor === */}
            <section className="bg-white rounded-xl shadow-md border border-gray-200 p-8 space-y-4">
                <div>
                    <h2 className="text-xl font-bold text-primary mb-1">Role as a Contributor</h2>
                    <p className="text-gray-600 text-sm text-justify">
                        The Contributor track is for researchers who want to become a member of the PolPaL community and actively contribute to the PolPaL database by adding and editing data.
                        As a Contributor, you can enrich the database by adding new linkages, validating existing linkages, and curating PolPaL entities.
                        You help to improve the quality of the data in PolPaL and contribute to the broader research community.
                    </p>
                    <p className="text-gray-600 text-sm text-justify mt-2">
                        Please find below the different tutorials for validating linkages, adding new linkages, and curating PolPaL entities. If you have any questions or need assistance, please contact the PolPaL team.
                    </p>
                </div>

                {/* Role: Contributor */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
                    <p className="font-semibold text-gray-900 mb-1">As a <span className="text-primary">Contributor</span></p>
                    <p className="text-sm text-gray-600 mb-4 text-justify">
                        Contributors can enrich the database by adding and editing the following data:
                    </p>
                    <ul className="grid sm:grid-cols-2 gap-3">
                        {contributorAreas.map((area) => {
                            const Icon = area.icon;
                            return (
                                <li key={area.label} className="flex gap-3 items-start">
                                    <Icon className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                                    <span>
                                        <span className="font-medium text-gray-900 text-sm">{area.label}</span>
                                        <span className="text-gray-500 text-sm"> — {area.description}</span>
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </section>

            <section className="bg-white rounded-xl shadow-md border border-gray-200 p-8 space-y-4">
                <div>
                    <h2 className="text-xl font-bold text-primary mb-1">Tutorials</h2>
                    <p className="text-gray-600 text-sm text-justify">
                        To start contributing, please follow the tutorials below.
                        They will guide you through the process of validating existing linkages, adding new linkages, and curating PolPaL entities.
                    </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold text-gray-900">Tutorial &apos;Validating Linkages&apos;</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                        View the tutorial presentation to learn step-by-step how to validate existing linkages.
                    </p>
                    <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                        <iframe
                            src="/tutorials/PolPaL-Tutorial_Validating.pdf"
                            title="PolPaL Tutorial Presentation"
                            className="w-full h-[600px]"
                        />
                    </div>
                    <a
                        href="/tutorials/PolPaL-Tutorial_Validating.pdf"
                        download
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                    >
                        <Download className="h-4 w-4" />
                        Download tutorial (PDF)
                    </a>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold text-gray-900">Tutorial &apos;Linking&apos;</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                        View the tutorial presentation to learn step-by-step how to add new linkages.
                    </p>
                    <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                        <iframe
                            src="/tutorials/PolPaL-Tutorial_Linking.pdf"
                            title="PolPaL Tutorial Presentation"
                            className="w-full h-[600px]"
                        />
                    </div>
                    <a
                        href="/tutorials/PolPaL-Tutorial_Linking.pdf"
                        download
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                    >
                        <Download className="h-4 w-4" />
                        Download tutorial (PDF)
                    </a>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold text-gray-900">Tutorial &apos;Curating PolPaL Entities&apos;</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                        View the tutorial presentation to learn step-by-step how to curate PolPaL entities.
                    </p>
                    <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                        <iframe
                            src="/tutorials/PolPaL-Tutorial_Entities.pdf"
                            title="PolPaL Tutorial Presentation"
                            className="w-full h-[600px]"
                        />
                    </div>
                    <a
                        href="/tutorials/PolPaL-Tutorial_Entities.pdf"
                        download
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                    >
                        <Download className="h-4 w-4" />
                        Download tutorial (PDF)
                    </a>
                </div>
            </section>
        </main>
    );
}
