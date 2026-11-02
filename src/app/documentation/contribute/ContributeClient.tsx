"use client";

import { UserPlus, MailCheck, ShieldCheck, Link2, CheckCircle, BookOpen, GitMerge, Users, ArrowRight, LockOpen } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Link from "next/link";

const registrationSteps = [
    {
        icon: UserPlus,
        title: "Create an account",
        description: "Register with your name, email address, and a username.",
        action: { label: "Register", href: "/authentication/register" },
    },
    {
        icon: MailCheck,
        title: "Verify your email",
        description: "Check your inbox and click the verification link. It expires after 24 hours.",
    },
    {
        icon: ShieldCheck,
        title: "Wait for admin approval",
        description: "An administrator reviews your request and assigns a role. You will be notified by email once approved.",
    },
    {
        icon: Link2,
        title: "Start contributing",
        description: "Once approved, log in and start linking data or curating entities based on your assigned role.",
    }
];

const contributorAreas = [
    { icon: Link2, label: "Linking", description: "Link external dataset entries to PolPaL entities" },
    { icon: CheckCircle, label: "Validation", description: "Validate links between external dataset entries and PolPaL entities" },
    { icon: BookOpen, label: "Historical names", description: "Add historical entity names" },
    { icon: GitMerge, label: "Party changes", description: "Document predecessor/successor relationships between parties" },
    { icon: Users, label: "Grouping memberships", description: "Record grouping memberships of entities" },
    { icon: LockOpen, label: "Access", description: "Gain access to work-in-progress datasets" },
];

export default function ContributeClient() {
    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

            {/* Breadcrumbs */}
            <Breadcrumbs items={[
                { label: "Home", href: "/" },
                { label: "Contribute" },
            ]} />

            {/* Hero */}
            <section className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
                <h1 className="text-2xl font-bold mb-3 text-primary">Contribute to PolPaL</h1>
                <p className="text-gray-700 text-justify">
                    PolPaL welcomes contributions from individual researchers and data publishers alike.
                    Depending on your role, you can help by linking data, curating political entities,
                    or integrating entire datasets into the platform.
                </p>
            </section>

            {/* === TRACK 1: Individual Researcher === */}
            <section className="bg-white rounded-xl shadow-md border border-gray-200 p-8 space-y-8">
                <div>
                    <h2 className="text-xl font-bold text-primary mb-1">Contribute as Individual Researcher</h2>
                    <p className="text-gray-600 text-sm text-justify">
                        Create a free account and contribute directly to the database. Depending on the role
                        assigned at approval, you can link and validate data or curate political entity information.
                    </p>
                </div>

                {/* Registration steps */}
                <div>
                    <h3 className="font-semibold text-gray-800 mb-4">How to get started</h3>
                    <ol className="space-y-5">
                        {registrationSteps.map((step, index) => {
                            const Icon = step.icon;
                            return (
                                <li key={index} className="flex gap-5">
                                    <div className="flex-shrink-0 flex flex-col items-center">
                                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Icon className="h-4 w-4 text-primary" />
                                        </div>
                                        {index < registrationSteps.length - 1 && (
                                            <div className="w-px flex-1 bg-gray-200 mt-2" />
                                        )}
                                    </div>
                                    <div className="pb-5">
                                        <p className="font-semibold text-gray-900 text-sm mb-0.5">
                                            {index + 1}. {step.title}
                                        </p>
                                        <p className="text-gray-600 text-sm">{step.description}</p>
                                        {step.action && (
                                            <Link
                                                href={step.action.href}
                                                className="inline-flex items-center gap-1 mt-1.5 text-sm text-primary font-medium hover:underline"
                                            >
                                                {step.action.label}
                                                <ArrowRight className="h-3.5 w-3.5" />
                                            </Link>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
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

            {/* === TRACK 2: Data Publisher === */}
            <section className="bg-white rounded-xl shadow-md border border-gray-200 p-8 space-y-4">
                <div>
                    <h2 className="text-xl font-bold text-primary mb-1">Contribute as Data Publisher</h2>
                    <p className="text-gray-600 text-sm text-justify">
                        If you maintain a dataset containing information about political parties and would like it to be integrated into PolPaL,
                        please get in touch with the team directly. Dataset integration is arranged on a
                        case-by-case basis.
                    </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 space-y-3">
                    <p className="font-semibold text-gray-900 text-sm">What dataset integration involves</p>
                    <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex gap-2 items-start">
                            <span className="text-primary font-bold leading-5">·</span>
                            <span><span className="font-medium text-gray-800">Access to the data</span> — sharing a current version of the dataset with the PolPaL team</span>
                        </li>
                        <li className="flex gap-2 items-start">
                            <span className="text-primary font-bold leading-5">·</span>
                            <span><span className="font-medium text-gray-800">Linking resources</span> — providing context or documentation to support accurate linking of dataset entries to PolPaL entities</span>
                        </li>
                        <li className="flex gap-2 items-start">
                            <span className="text-primary font-bold leading-5">·</span>
                            <span><span className="font-medium text-gray-800">Validation</span> — reviewing and confirming the resulting linkages before they are published</span>
                        </li>
                    </ul>
                </div>

                <p className="text-sm text-gray-600 text-justify">
                    To start a conversation about integrating your dataset, contact the PolPaL team.
                </p>
            </section>
        </main>
    );
}
