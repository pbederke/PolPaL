"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { RoleEnum } from "@/lib/shared/enums";
import AdminMasterDetail from "@/components/admin/AdminMasterDetail";

interface Dataset {
  datasetId: number;
  isHidden: boolean;
  isHiddenReason: string | null;
  projectKey: string;
  datasetKey: string;
  datasetNameShort: string;
  datasetName: string;
  datasetUrl: string | null;
  datasetDescription: string | null;
  comment: string | null;
  userId: number | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminDatasetsClient() {
  const { auth, loadingAuth } = useAuth();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Dataset[]>([]);
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
      fetch(`/api/admin/datasets?page=${page}`, { credentials: "include", signal: controller.signal })
        .then((res) => { if (!res.ok) throw new Error("Failed to load datasets."); return res.json(); })
        .then(({ items, total, pageCount }: { items: Dataset[]; total: number; pageCount: number }) => { setItems(items); setTotal(total); setPageCount(pageCount); })
        .catch((err: unknown) => { if (err instanceof Error && err.name === "AbortError") return; setError(err instanceof Error ? err.message : "Error fetching datasets."); })
        .finally(() => setLoading(false));
    };
    load();
    return () => controller.abort();
  }, [auth.loggedIn, auth.role, loadingAuth, page]);

  const handleDelete = async (item: Dataset, comment?: string) => {
    const res = await fetch(`/api/admin/datasets/${item.datasetKey}`, {
      method: "DELETE",
      credentials: "include",
      ...(comment ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ comment }) } : {}),
    });
    if (res.status === 409) { const data = await res.json(); throw new Error(data.message || "Cannot delete."); }
    if (!res.ok) throw new Error("Delete failed.");
    setItems((prev) => prev.filter((i) => i.datasetId !== item.datasetId));
    setTotal((prev) => prev - 1);
  };

  if (!auth || loadingAuth) return <LoadingSpinner title="Loading..." message="Authenticating user." />;
  if (auth.role !== RoleEnum.ADMIN) return <AccessDenied message="ADMIN rights required." />;

  return (
    <AdminMasterDetail
      title="Datasets"
      breadcrumbItems={[{ label: "Home", href: "/" }, { label: "Admin", href: "/admin" }, { label: "Datasets" }]}
      items={items}
      total={total}
      currentPage={page}
      pageCount={pageCount}
      onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
      onNextPage={() => setPage((p) => Math.min(pageCount, p + 1))}
      loading={loading}
      error={error}
      getItemId={(i) => i.datasetId}
      getItemLabel={(i) => i.datasetKey}
      getSearchText={(i) => [i.datasetKey, i.datasetName, i.datasetNameShort, i.projectKey].join(" ")}
      renderDetail={(i) => (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="datasetId">{i.datasetId}</Field>
          <Field label="projectKey">{i.projectKey}</Field>
          <Field label="datasetKey">{i.datasetKey}</Field>
          <Field label="datasetNameShort">{i.datasetNameShort}</Field>
          <Field label="datasetName">{i.datasetName}</Field>
          <Field label="isHidden">{i.isHidden ? "yes" : "no"}</Field>
          <Field label="isHiddenReason">{i.isHiddenReason ?? "—"}</Field>
          <Field label="datasetUrl" className="sm:col-span-2">{i.datasetUrl ? <a href={i.datasetUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{i.datasetUrl}</a> : "—"}</Field>
          <Field label="datasetDescription" className="sm:col-span-2">{i.datasetDescription ?? "—"}</Field>
          <Field label="comment" className="sm:col-span-2">{i.comment ?? "—"}</Field>
          <Field label="userId">{i.userId ?? "—"}</Field>
          <Field label="createdAt">{new Date(i.createdAt).toLocaleDateString()}</Field>
          <Field label="updatedAt">{new Date(i.updatedAt).toLocaleDateString()}</Field>
        </dl>
      )}
      onDelete={handleDelete}
      withDeleteComment
      getDeleteTitle={(i) => `Delete dataset #${i.datasetId}?`}
      getDeleteDescription={(i) => `This will permanently delete dataset "${i.datasetKey}". This action cannot be undone.`}
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
