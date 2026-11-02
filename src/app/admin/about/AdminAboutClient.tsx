"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { RoleEnum } from "@/lib/shared/enums";
import AdminMasterDetail from "@/components/admin/AdminMasterDetail";

interface AboutRecord {
  id: number;
  tableName: string;
  name: string | null;
  affiliation: string | null;
  time: string | null;
  url: string | null;
  funding: string | null;
  comment: string | null;
  createdAt: string;
}

export default function AdminAboutClient() {
  const { auth, loadingAuth } = useAuth();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AboutRecord[]>([]);
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
      fetch(`/api/admin/about?page=${page}`, { credentials: "include", signal: controller.signal })
        .then((res) => { if (!res.ok) throw new Error("Failed to load about records."); return res.json(); })
        .then(({ items, total, pageCount }: { items: AboutRecord[]; total: number; pageCount: number }) => { setItems(items); setTotal(total); setPageCount(pageCount); })
        .catch((err: unknown) => { if (err instanceof Error && err.name === "AbortError") return; setError(err instanceof Error ? err.message : "Error fetching about records."); })
        .finally(() => setLoading(false));
    };
    load();
    return () => controller.abort();
  }, [auth.loggedIn, auth.role, loadingAuth, page]);

  const handleDelete = async (item: AboutRecord) => {
    const res = await fetch(`/api/admin/about/${item.id}`, { method: "DELETE", credentials: "include" });
    if (res.status === 409) { const data = await res.json(); throw new Error(data.message || "Cannot delete."); }
    if (!res.ok) throw new Error("Delete failed.");
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setTotal((prev) => prev - 1);
  };

  if (!auth || loadingAuth) return <LoadingSpinner title="Loading..." message="Authenticating user." />;
  if (auth.role !== RoleEnum.ADMIN) return <AccessDenied message="ADMIN rights required." />;

  return (
    <AdminMasterDetail
      title="About"
      breadcrumbItems={[{ label: "Home", href: "/" }, { label: "Admin", href: "/admin" }, { label: "About" }]}
      items={items}
      total={total}
      currentPage={page}
      pageCount={pageCount}
      onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
      onNextPage={() => setPage((p) => Math.min(pageCount, p + 1))}
      loading={loading}
      error={error}
      getItemId={(i) => i.id}
      getItemLabel={(i) => i.name ?? i.tableName}
      getSearchText={(i) => [i.tableName, i.name ?? "", i.affiliation ?? ""].join(" ")}
      renderDetail={(i) => (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="id">{i.id}</Field>
          <Field label="tableName">{i.tableName}</Field>
          <Field label="name">{i.name ?? "—"}</Field>
          <Field label="affiliation">{i.affiliation ?? "—"}</Field>
          <Field label="time">{i.time ?? "—"}</Field>
          <Field label="funding">{i.funding ?? "—"}</Field>
          <Field label="url" className="sm:col-span-2">{i.url ? <a href={i.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{i.url}</a> : "—"}</Field>
          <Field label="comment" className="sm:col-span-2">{i.comment ?? "—"}</Field>
          <Field label="createdAt">{new Date(i.createdAt).toLocaleDateString()}</Field>
        </dl>
      )}
      onDelete={handleDelete}
      getDeleteTitle={(i) => `Delete about record #${i.id}?`}
      getDeleteDescription={(i) => `This will permanently delete record #${i.id} (${i.tableName}${i.name ? ` — ${i.name}` : ""}). This action cannot be undone.`}
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
