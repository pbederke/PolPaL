"use client";

import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { RoleEnum } from "@/lib/shared/enums";
import Link from "next/link";

const sections = [
  { href: "/admin/changelog/created", label: "Created", color: "green", desc: "Records that were created" },
  { href: "/admin/changelog/updated", label: "Updated", color: "yellow", desc: "Records that were updated" },
  { href: "/admin/changelog/deleted", label: "Deleted", color: "red",   desc: "Records that were deleted" },
] as const;

const borderMap = { green: "border-green-200 hover:border-green-400", yellow: "border-yellow-200 hover:border-yellow-400", red: "border-red-200 hover:border-red-400" };
const textMap   = { green: "text-green-700", yellow: "text-yellow-700", red: "text-red-700" };

export default function AdminChangelogClient() {
  const { auth, loadingAuth } = useAuth();

  if (!auth || loadingAuth) return <LoadingSpinner title="Loading..." message="Authenticating user." />;
  if (auth.role !== RoleEnum.ADMIN) return <AccessDenied message="ADMIN rights are required to view the changelog." />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Admin", href: "/admin" }, { label: "Changelog" }]} />
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Changelog</h1>
        <p className="text-gray-500">All create / update / delete operations</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className={`block bg-white rounded-lg shadow-sm border p-6 transition-colors ${borderMap[s.color]}`}
          >
            <h2 className={`text-lg font-bold ${textMap[s.color]}`}>{s.label}</h2>
            <p className="text-sm text-gray-500 mt-1">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
