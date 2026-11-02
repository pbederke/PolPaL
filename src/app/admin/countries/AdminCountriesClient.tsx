"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { RoleEnum } from "@/lib/shared/enums";
import AdminMasterDetail from "@/components/admin/AdminMasterDetail";

interface Countries {
  isCountry: boolean;
  countryId: number;
  countrycodePolpal: string;
  iso2c: string | null;
  iso3c: string | null;
  iso3n: number | null;
  countryname: string;
  region: string;
  regionCode: string | null;
  regionSub: string | null;
  regionSubCode: string | null;
  regionIntermediate: string | null;
  regionIntermediateCode: string | null;
  createdAt: string;
  updatedAt: string;
  userId: number | null;
}

export default function AdminCountriesClient() {
  const { auth, loadingAuth } = useAuth();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Countries[]>([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loadingAuth) return;
    if (!auth.loggedIn || auth.role !== RoleEnum.ADMIN) return;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      fetch(`/api/admin/countries?page=${page}`, { credentials: "include", signal: controller.signal })
        .then((res) => { if (!res.ok) throw new Error("Failed to load countries."); return res.json(); })
        .then(({ items, total, pageCount }: { items: Countries[]; total: number; pageCount: number }) => { setItems(items); setTotal(total); setPageCount(pageCount); })
        .catch((err: unknown) => { if (err instanceof Error && err.name === "AbortError") return; setError(err instanceof Error ? err.message : "Error fetching countries."); })
        .finally(() => setLoading(false));
    };
    load();
    return () => controller.abort();
  }, [auth.loggedIn, auth.role, loadingAuth, page]);

  const handleDelete = async (item: Countries, comment?: string) => {
    const res = await fetch(`/api/countries/${item.countrycodePolpal}`, {
      method: "DELETE",
      credentials: "include",
      ...(comment ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ comment }) } : {}),
    });
    if (res.status === 409) { const data = await res.json(); throw new Error(data.message || "Cannot delete."); }
    if (!res.ok) throw new Error("Delete failed.");
    setItems((prev) => prev.filter((i) => i.countrycodePolpal !== item.countrycodePolpal));
    setTotal((prev) => prev - 1);
  };

  if (!auth || loadingAuth) return <LoadingSpinner title="Loading..." message="Authenticating user." />;
  if (auth.role !== RoleEnum.ADMIN) return <AccessDenied message="ADMIN rights required." />;

  return (
    <AdminMasterDetail
      title="Countries"
      breadcrumbItems={[{ label: "Home", href: "/" }, { label: "Admin", href: "/admin" }, { label: "Countries" }]}
      items={items}
      total={total}
      currentPage={page}
      pageCount={pageCount}
      onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
      onNextPage={() => setPage((p) => Math.min(pageCount, p + 1))}
      loading={loading}
      error={error}
      getItemId={(i) => i.countryId}
      getItemLabel={(i) => i.countryname}
      getSearchText={(i) => [i.countryname, i.countrycodePolpal, i.iso2c ?? "", i.iso3c ?? ""].join(" ")}
      renderDetail={(i) => (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="countryId">{i.countryId}</Field>
          <Field label="countrycodePolpal"><Link href={`/data/countries/${i.countrycodePolpal}`} className="text-primary hover:underline">{i.countrycodePolpal}</Link></Field>
          <Field label="countryname">{i.countryname}</Field>
          <Field label="isCountry">{i.isCountry ? "yes" : "no"}</Field>
          <Field label="iso2c">{i.iso2c ?? "—"}</Field>
          <Field label="iso3c">{i.iso3c ?? "—"}</Field>
          <Field label="iso3n">{i.iso3n ?? "—"}</Field>
          <Field label="region">{i.region}</Field>
          <Field label="regionCode">{i.regionCode ?? "—"}</Field>
          <Field label="regionSub">{i.regionSub ?? "—"}</Field>
          <Field label="regionSubCode">{i.regionSubCode ?? "—"}</Field>
          <Field label="regionIntermediate">{i.regionIntermediate ?? "—"}</Field>
          <Field label="regionIntermediateCode">{i.regionIntermediateCode ?? "—"}</Field>
          <Field label="userId">{i.userId ?? "—"}</Field>
          <Field label="createdAt">{new Date(i.createdAt).toLocaleDateString()}</Field>
          <Field label="updatedAt">{new Date(i.updatedAt).toLocaleDateString()}</Field>
        </dl>
      )}
      onDelete={handleDelete}
      withDeleteComment
      getDeleteTitle={(i) => `Delete country ${i.countrycodePolpal}?`}
      getDeleteDescription={(i) => `This will permanently delete "${i.countryname}" (${i.countrycodePolpal}). This action cannot be undone.`}
    />
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{children}</dd>
    </div>
  );
}
