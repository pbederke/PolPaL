"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { EyeOff, HelpCircle, MessageSquare, Search, ShieldAlert } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { EntityTypeBadge } from "@/components/ui/EntityTypeBadge";

interface Check {
  href: string;
  title: string;
  description: ReactNode;
  iconBg: string;
  iconColor: string;
  icon: ReactNode;
  tag: string;
}

const CHECKS: Check[] = [
  {
    href: "/data/quality-checks/unassigned-entities",
    title: "Unassigned Entities",
    description: <>Lists all entities currently marked as <EntityTypeBadge entityType="UNASSIGNED" size="sm" />.</>,
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    icon: <HelpCircle className="h-5 w-5" />,
    tag: "Entities",
  },
  {
    href: "/data/quality-checks/hidden-entities",
    title: "Hidden Entities",
    description: <>Lists all entities that are hidden from users.</>,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    icon: <EyeOff className="h-5 w-5" />,
    tag: "Entities",
  },
  {
    href: "/data/quality-checks/commented-entities",
    title: "Commented Entities",
    description: <>Lists all entities that have comments attached.</>,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    icon: <MessageSquare className="h-5 w-5" />,
    tag: "Entities",
  },
  {
    href: "/data/quality-checks/unknown-entries",
    title: "Unknown Entries",
    description: <>Lists all dataset entries linked to <EntityTypeBadge entityType="UNKNOWN" size="sm" /> entities.</>,
    iconBg: "bg-gray-100",
    iconColor: "text-gray-600",
    icon: <Search className="h-5 w-5" />,
    tag: "Entries",
  },
  {
    href: "/data/quality-checks/rejected-validations",
    title: "Rejected Validations",
    description: <>Lists all dataset entries with at least one rejected validation.</>,
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
    icon: <ShieldAlert className="h-5 w-5" />,
    tag: "Entries",
  },
];

export default function QualityChecksClient() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Quality Checks" },
      ]} />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Quality Checks</h1>
        <p className="mt-1.5 text-gray-500 text-sm sm:text-base">
          Identify and review data issues across the PolPaL database.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CHECKS.map((check) => (
          <Link
            key={check.href}
            href={check.href}
            className="group flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`shrink-0 ${check.iconBg} rounded-lg p-2.5 ${check.iconColor}`}>
                {check.icon}
              </div>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${check.iconBg} ${check.iconColor}`}>
                {check.tag}
              </span>
            </div>
            <h2 className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors mb-1">
              {check.title}
            </h2>
            <p className="text-xs text-gray-500 leading-relaxed flex-1">{check.description}</p>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400 group-hover:text-primary transition-colors">
                View details
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-gray-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
