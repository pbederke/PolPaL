"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { RoleEnum } from "@/lib/shared/enums";
import AdminMasterDetail from "@/components/admin/AdminMasterDetail";

interface EntityName {
  entityNameId: number;
  polpalId: number;
  nameShort: string;
  name: string;
  language: string;
  comment: string | null;
  startYear: number | null;
  startMonth: number | null;
  startDay: number | null;
  endYear: number | null;
  endMonth: number | null;
  endDay: number | null;
  createdAt: string;
  updatedAt: string;
  userId: number | null;
}

export default function AdminEntityNamesClient() {
  const { auth, loadingAuth } = useAuth();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<EntityName[]>([]);
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
      fetch(`/api/admin/entity-names?page=${page}`, { credentials: "include", signal: controller.signal })
        .then((res) => { if (!res.ok) throw new Error("Failed to load entity names."); return res.json(); })
        .then(({ items, total, pageCount }: { items: EntityName[]; total: number; pageCount: number }) => { setItems(items); setTotal(total); setPageCount(pageCount); })
        .catch((err: unknown) => { if (err instanceof Error && err.name === "AbortError") return; setError(err instanceof Error ? err.message : "Error fetching entity names."); })
        .finally(() => setLoading(false));
    };
    load();
    return () => controller.abort();
  }, [auth.loggedIn, auth.role, loadingAuth, page]);

  const handleDelete = async (item: EntityName, comment?: string) => {
    const res = await fetch(`/api/admin/entity-names/${item.entityNameId}`, {
      method: "DELETE",
      credentials: "include",
      ...(comment ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ comment }) } : {}),
    });
    if (res.status === 409) { const data = await res.json(); throw new Error(data.message || "Cannot delete."); }
    if (!res.ok) throw new Error("Delete failed.");
    setItems((prev) => prev.filter((i) => i.entityNameId !== item.entityNameId));
    setTotal((prev) => prev - 1);
  };

  if (!auth || loadingAuth) return <LoadingSpinner title="Loading..." message="Authenticating user." />;
  if (auth.role !== RoleEnum.ADMIN) return <AccessDenied message="ADMIN rights required." />;

  return (
    <AdminMasterDetail
      title="Entity Names"
      breadcrumbItems={[{ label: "Home", href: "/" }, { label: "Admin", href: "/admin" }, { label: "Entity Names" }]}
      items={items}
      total={total}
      currentPage={page}
      pageCount={pageCount}
      onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
      onNextPage={() => setPage((p) => Math.min(pageCount, p + 1))}
      loading={loading}
      error={error}
      getItemId={(i) => i.entityNameId}
      getItemLabel={(i) => i.nameShort}
      getSearchText={(i) => [i.nameShort, i.name, i.language, String(i.polpalId)].join(" ")}
      renderDetail={(i) => (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="entityNameId">{i.entityNameId}</Field>
          <Field label="polpalId">{i.polpalId}</Field>
          <Field label="nameShort">{i.nameShort}</Field>
          <Field label="name">{i.name}</Field>
          <Field label="language">{i.language}</Field>
          <Field label="startYear">{i.startYear ?? "—"}</Field>
          <Field label="startMonth">{i.startMonth ?? "—"}</Field>
          <Field label="startDay">{i.startDay ?? "—"}</Field>
          <Field label="endYear">{i.endYear ?? "—"}</Field>
          <Field label="endMonth">{i.endMonth ?? "—"}</Field>
          <Field label="endDay">{i.endDay ?? "—"}</Field>
          <Field label="comment" className="sm:col-span-2">{i.comment ?? "—"}</Field>
          <Field label="userId">{i.userId ?? "—"}</Field>
          <Field label="createdAt">{new Date(i.createdAt).toLocaleDateString()}</Field>
          <Field label="updatedAt">{new Date(i.updatedAt).toLocaleDateString()}</Field>
        </dl>
      )}
      onDelete={handleDelete}
      withDeleteComment
      getDeleteTitle={(i) => `Delete entity name #${i.entityNameId}?`}
      getDeleteDescription={(i) => `This will permanently delete entity name "${i.nameShort}" (id ${i.entityNameId}). This action cannot be undone.`}
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
