"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { RoleEnum } from "@/lib/shared/enums";
import AdminMasterDetail from "@/components/admin/AdminMasterDetail";

interface Entry {
  entryId: number;
  usedFile: string;
  dateDownloaded: string;
  projectKey: string;
  datasetKey: string;
  versionKey: string;
  entryCountryVar: string | null;
  entryCountry: string | null;
  entryYearVar: string | null;
  entryYear: number | null;
  entryMonthVar: string | null;
  entryMonth: number | null;
  entryDayVar: string | null;
  entryDay: number | null;
  entryEntityIdVar: string;
  entryEntityId: string;
  entryEntityNameShortVar: string | null;
  entryEntityNameShort: string | null;
  entryEntityNameEnglishVar: string | null;
  entryEntityNameEnglish: string | null;
  entryEntityNameVar: string | null;
  entryEntityName: string | null;
  additionalInformation: string | null;
  countrycodePolpal: string;
  uniqueObservationId: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  userId: number | null;
}

export default function AdminEntriesClient() {
  const { auth, loadingAuth } = useAuth();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Entry[]>([]);
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
      fetch(`/api/admin/entries?page=${page}`, { credentials: "include", signal: controller.signal })
        .then((res) => { if (!res.ok) throw new Error("Failed to load entries."); return res.json(); })
        .then(({ items, total, pageCount }: { items: Entry[]; total: number; pageCount: number }) => { setItems(items); setTotal(total); setPageCount(pageCount); })
        .catch((err: unknown) => { if (err instanceof Error && err.name === "AbortError") return; setError(err instanceof Error ? err.message : "Error fetching entries."); })
        .finally(() => setLoading(false));
    };
    load();
    return () => controller.abort();
  }, [auth.loggedIn, auth.role, loadingAuth, page]);

  const handleDelete = async (item: Entry) => {
    const res = await fetch(`/api/admin/entries/${item.entryId}`, { method: "DELETE", credentials: "include" });
    if (res.status === 409) { const data = await res.json(); throw new Error(data.message || "Cannot delete."); }
    if (!res.ok) throw new Error("Delete failed.");
    setItems((prev) => prev.filter((i) => i.entryId !== item.entryId));
    setTotal((prev) => prev - 1);
  };

  if (!auth || loadingAuth) return <LoadingSpinner title="Loading..." message="Authenticating user." />;
  if (auth.role !== RoleEnum.ADMIN) return <AccessDenied message="ADMIN rights required." />;

  return (
    <AdminMasterDetail
      title="Entries"
      breadcrumbItems={[{ label: "Home", href: "/" }, { label: "Admin", href: "/admin" }, { label: "Entries" }]}
      items={items}
      total={total}
      currentPage={page}
      pageCount={pageCount}
      onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
      onNextPage={() => setPage((p) => Math.min(pageCount, p + 1))}
      loading={loading}
      error={error}
      getItemId={(i) => i.entryId}
      getItemLabel={(i) => i.uniqueObservationId}
      getSearchText={(i) => [i.uniqueObservationId, i.projectKey, i.datasetKey, i.versionKey, i.countrycodePolpal, i.entryEntityId].join(" ")}
      renderDetail={(i) => (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="entryId">{i.entryId}</Field>
          <Field label="uniqueObservationId">{i.uniqueObservationId}</Field>
          <Field label="projectKey">{i.projectKey}</Field>
          <Field label="datasetKey">{i.datasetKey}</Field>
          <Field label="versionKey">{i.versionKey}</Field>
          <Field label="countrycodePolpal">{i.countrycodePolpal}</Field>
          <Field label="entryCountry">{i.entryCountry ?? "—"}</Field>
          <Field label="entryYear">{i.entryYear ?? "—"}</Field>
          <Field label="entryMonth">{i.entryMonth ?? "—"}</Field>
          <Field label="entryDay">{i.entryDay ?? "—"}</Field>
          <Field label="entryEntityId">{i.entryEntityId}</Field>
          <Field label="entryEntityNameShort">{i.entryEntityNameShort ?? "—"}</Field>
          <Field label="entryEntityNameEnglish">{i.entryEntityNameEnglish ?? "—"}</Field>
          <Field label="entryEntityName">{i.entryEntityName ?? "—"}</Field>
          <Field label="usedFile" className="sm:col-span-2">{i.usedFile}</Field>
          <Field label="dateDownloaded">{new Date(i.dateDownloaded).toLocaleDateString()}</Field>
          <Field label="additionalInformation" className="sm:col-span-2">{i.additionalInformation ?? "—"}</Field>
          <Field label="note" className="sm:col-span-2">{i.note ?? "—"}</Field>
          <Field label="userId">{i.userId ?? "—"}</Field>
          <Field label="createdAt">{new Date(i.createdAt).toLocaleDateString()}</Field>
          <Field label="updatedAt">{new Date(i.updatedAt).toLocaleDateString()}</Field>
        </dl>
      )}
      onDelete={handleDelete}
      getDeleteTitle={(i) => `Delete entry #${i.entryId}?`}
      getDeleteDescription={(i) => `This will permanently delete entry "${i.uniqueObservationId}". This action cannot be undone.`}
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
