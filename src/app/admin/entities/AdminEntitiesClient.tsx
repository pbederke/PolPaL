"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { EntityTypesEnum, RoleEnum } from "@/lib/shared/enums";
import AdminMasterDetail from "@/components/admin/AdminMasterDetail";

interface Entities {
  polpalId: number;
  partyfactsId: number | null;
  isHidden: boolean;
  isHiddenReason: string | null;
  nameShort: string;
  nameEnglish: string;
  name: string | null;
  entityType: EntityTypesEnum;
  wikipediaUrl: string | null;
  wikidataId: string | null;
  logoUrl: string | null;
  logoUrlCachedAt: string | null;
  logoAttribution: string | null;
  color: string | null;
  colorCachedAt: string | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  userId: number | null;
  EntitiesInCountries: { Countries: { countrycodePolpal: string } }[];
}

export default function AdminEntitiesPage() {
  const { auth, loadingAuth } = useAuth();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Entities[]>([]);
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
      fetch(`/api/admin/entities?page=${page}`, { credentials: "include", signal: controller.signal })
        .then((res) => { if (!res.ok) throw new Error("Failed to load entities."); return res.json(); })
        .then(({ items, total, pageCount }) => { setItems(items); setTotal(total); setPageCount(pageCount); })
        .catch((err: unknown) => { if (err instanceof Error && err.name === "AbortError") return; setError(err instanceof Error ? err.message : "Error fetching entities."); })
        .finally(() => setLoading(false));
    };
    load();
    return () => controller.abort();
  }, [auth.loggedIn, auth.role, loadingAuth, page]);

  const handleDelete = async (item: Entities, comment?: string) => {
    const res = await fetch(`/api/entities/${item.polpalId}`, {
      method: "DELETE",
      credentials: "include",
      ...(comment ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ comment }) } : {}),
    });
    if (res.status === 409) { const data = await res.json(); throw new Error(data.message || "Cannot delete."); }
    if (!res.ok) throw new Error("Delete failed.");
    setItems((prev) => prev.filter((i) => i.polpalId !== item.polpalId));
    setTotal((prev) => prev - 1);
  };

  if (!auth || loadingAuth) return <LoadingSpinner title="Loading..." message="Authenticating user." />;
  if (auth.role !== RoleEnum.ADMIN) return <AccessDenied message="ADMIN rights are required to view and manage entities." />;

  return (
    <AdminMasterDetail
      title="Entities"
      breadcrumbItems={[{ label: "Home", href: "/" }, { label: "Admin", href: "/admin" }, { label: "Entities" }]}
      items={items}
      total={total}
      currentPage={page}
      pageCount={pageCount}
      onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
      onNextPage={() => setPage((p) => Math.min(pageCount, p + 1))}
      loading={loading}
      error={error}
      getItemId={(i) => i.polpalId}
      getItemLabel={(i) => i.nameShort}
      getSearchText={(i) => [i.nameShort, i.nameEnglish, i.name ?? "", i.entityType].join(" ")}
      renderDetail={(i) => (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="polpalId"><Link href={`/data/entities/${i.polpalId}`} className="text-primary hover:underline">{i.polpalId}</Link></Field>
          <Field label="partyfactsId">{i.partyfactsId ?? "—"}</Field>
          <Field label="isHidden">{i.isHidden ? "yes" : "no"}</Field>
          <Field label="isHiddenReason">{i.isHiddenReason ?? "—"}</Field>
          <Field label="nameShort">{i.nameShort}</Field>
          <Field label="nameEnglish">{i.nameEnglish}</Field>
          <Field label="name">{i.name ?? "—"}</Field>
          <Field label="entityType">{i.entityType}</Field>
          <Field label="countries" className="sm:col-span-2">
            {i.EntitiesInCountries?.length > 0
              ? i.EntitiesInCountries.map((pic, idx) => (
                  <span key={pic.Countries.countrycodePolpal}>
                    <Link href={`/data/countries/${pic.Countries.countrycodePolpal}`} className="text-primary hover:underline">{pic.Countries.countrycodePolpal}</Link>
                    {idx < i.EntitiesInCountries.length - 1 && ", "}
                  </span>
                ))
              : "—"}
          </Field>
          <Field label="wikipediaUrl" className="sm:col-span-2">{i.wikipediaUrl ? <a href={i.wikipediaUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{i.wikipediaUrl}</a> : "—"}</Field>
          <Field label="wikidataId">{i.wikidataId ? <a href={i.wikidataId} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{i.wikidataId}</a> : "—"}</Field>
          <Field label="logoUrl">{i.logoUrl ? <a href={i.logoUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{i.logoUrl}</a> : "—"}</Field>
          <Field label="logoAttribution">{i.logoAttribution ?? "—"}</Field>
          <Field label="color">{i.color ? <span className="flex items-center gap-2"><span className="inline-block w-4 h-4 rounded border" style={{ background: i.color }} />{i.color}</span> : "—"}</Field>
          <Field label="comment" className="sm:col-span-2">{i.comment ?? "—"}</Field>
          <Field label="userId">{i.userId ?? "—"}</Field>
          <Field label="createdAt">{new Date(i.createdAt).toLocaleDateString()}</Field>
          <Field label="updatedAt">{new Date(i.updatedAt).toLocaleDateString()}</Field>
        </dl>
      )}
      onDelete={handleDelete}
      withDeleteComment
      getDeleteTitle={(i) => `Delete entity #${i.polpalId}?`}
      getDeleteDescription={(i) => `This will permanently delete "${i.nameShort}" (polpalId ${i.polpalId}). This action cannot be undone.`}
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
