"use client";

import Link from "next/link";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { RoleEnum } from "@/lib/shared/enums";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AccessDenied } from "@/components/ui/AccessDenied";
import {
  Group,
  Users,
  FileText,
  Database,
  Globe,
  Newspaper,
  SquareUserRound,
  SquareChartGantt,
  GalleryHorizontalEnd,
  Tag,
  ArrowLeftRight,
  MapPin,
  Rows3,
  Link2,
  ShieldCheck,
  Info,
  Flag,
  BarChart2,
  Activity,
} from "lucide-react";

interface Count {
  count: number;
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}

function AdminCard({
  href,
  icon: Icon,
  title,
  description,
  badge,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  badge?: React.ReactNode;
}) {
  return (
    <Link href={href} className="block group">
      <div className="rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all bg-white h-full flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="bg-gray-100 group-hover:bg-primary/10 rounded-lg p-2 transition-colors">
            <Icon className="w-5 h-5 text-gray-600 group-hover:text-primary transition-colors" />
          </div>
          {badge}
        </div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-xs text-gray-500 flex-1">{description}</p>
      </div>
    </Link>
  );
}

export default function AdminMenuPage() {
  const { auth, loadingAuth } = useAuth();
  const [count, setCount] = useState<Count>({ count: 0 });

  useEffect(() => {
    if (loadingAuth || !auth.loggedIn || auth.role !== RoleEnum.ADMIN) return;
    const abortController = new AbortController();
    fetch(`/api/admin/approveUsersCount`, { credentials: "include", signal: abortController.signal })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data) setCount(data); })
      .catch(() => {});
    return () => abortController.abort();
  }, [auth.loggedIn, auth.role, loadingAuth]);

  if (!auth || loadingAuth) {
    return <LoadingSpinner title="Loading authentication..." message="Authenticating user. Please wait a moment." />;
  }
  if (!loadingAuth && auth.role !== RoleEnum.ADMIN) {
    return <AccessDenied message="You do not have the necessary permissions to access this page." />;
  }

  const pendingBadge = count.count > 0 ? (
    <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 bg-red-600 text-white text-xs font-bold rounded-full">
      {count.count}
    </span>
  ) : undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Admin" },
      ]} />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">Admin Interface</h1>
        <p className="text-gray-500">Manage all data and administrative operations in PolPaL.</p>
      </div>

      {/* ── Data Tables ──────────────────────────────────────── */}
      <section>
        <SectionHeading
          title="Data Tables"
          description="Browse, search, and delete records across all database tables."
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <AdminCard href="/admin/countries"              icon={Globe}            title="Countries"               description="Country records and ISO codes" />
          <AdminCard href="/admin/entities"               icon={Group}            title="Entities"                description="Political parties and groupings" />
          <AdminCard href="/admin/entity-names"           icon={Tag}              title="Entity Names"            description="Alternative names by language" />
          <AdminCard href="/admin/entity-changes"         icon={ArrowLeftRight}   title="Entity Changes"          description="Splits, merges and rebrands" />
          <AdminCard href="/admin/entities-in-countries"  icon={MapPin}           title="Entities in Countries"   description="Entity–country assignments" />
          <AdminCard href="/admin/grouping-members"       icon={Users}            title="Grouping Members"        description="Entity membership in groupings" />
          <AdminCard href="/admin/projects"               icon={SquareChartGantt} title="Projects"                description="Data source projects" />
          <AdminCard href="/admin/datasets"               icon={Database}         title="Datasets"                description="Datasets per project" />
          <AdminCard href="/admin/versions"               icon={GalleryHorizontalEnd} title="Versions"            description="Dataset version records" />
          <AdminCard href="/admin/entries"                icon={Rows3}            title="Entries"                 description="Raw observation entries" />
          <AdminCard href="/admin/link-entries-entities"  icon={Link2}            title="Links"                   description="Entry-to-entity linkages" />
          <AdminCard href="/admin/validation"             icon={ShieldCheck}      title="Validation Links"        description="Link validation results" />
          <AdminCard href="/admin/references"             icon={FileText}         title="References"              description="Source references" />
          <AdminCard href="/admin/about"                  icon={Info}             title="About"                   description="Contributors and credits" />
          <AdminCard href="/admin/report-tickets"         icon={Flag}             title="Report Tickets"          description="User-submitted issue reports" />
        </div>
      </section>

      {/* ── Admin Operations ─────────────────────────────────── */}
      <section>
        <SectionHeading
          title="Admin Operations"
          description="User management, moderation and system logs."
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <AdminCard href="/admin/users"        icon={SquareUserRound} title="Users"                 description="Manage all user accounts" />
          <AdminCard href="/admin/approveUsers" icon={SquareUserRound} title="Approve User Requests" description="Review new registration requests" badge={pendingBadge} />
          <AdminCard href="/admin/changelog"    icon={FileText}        title="Changelog"             description="Recent edits and imports" />
          <AdminCard href="/admin/news"         icon={Newspaper}       title="News"                  description="News articles and updates" />
          <AdminCard href="/admin/analytics"    icon={BarChart2}       title="Download Analytics"    description="Download counts by type, version and script" />
          <AdminCard href="/admin/user-activities" icon={Activity}     title="User Activities"       description="Per-user contributions and share of total" />
        </div>
      </section>
    </div>
  );
}