"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { RoleEnum } from "@/lib/shared/enums";
import AdminMasterDetail from "@/components/admin/AdminMasterDetail";

interface GroupingMember {
  groupingMemberId: number;
  entityId: number;
  groupingId: number;
  startYear: number | null;
  startMonth: number | null;
  startDay: number | null;
  endYear: number | null;
  endMonth: number | null;
  endDay: number | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  userId: number | null;
}

export default function AdminGroupingMembersClient() {
  const { auth, loadingAuth } = useAuth();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<GroupingMember[]>([]);
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
      fetch(`/api/admin/grouping-members?page=${page}`, { credentials: "include", signal: controller.signal })
        .then((res) => { if (!res.ok) throw new Error("Failed to load grouping members."); return res.json(); })
        .then(({ items, total, pageCount }: { items: GroupingMember[]; total: number; pageCount: number }) => { setItems(items); setTotal(total); setPageCount(pageCount); })
        .catch((err: unknown) => { if (err instanceof Error && err.name === "AbortError") return; setError(err instanceof Error ? err.message : "Error fetching grouping members."); })
        .finally(() => setLoading(false));
    };
    load();
    return () => controller.abort();
  }, [auth.loggedIn, auth.role, loadingAuth, page]);

  const handleDelete = async (item: GroupingMember, comment?: string) => {
    const res = await fetch(`/api/admin/grouping-members/${item.groupingMemberId}`, {
      method: "DELETE",
      credentials: "include",
      ...(comment ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ comment }) } : {}),
    });
    if (res.status === 409) { const data = await res.json(); throw new Error(data.message || "Cannot delete."); }
    if (!res.ok) throw new Error("Delete failed.");
    setItems((prev) => prev.filter((i) => i.groupingMemberId !== item.groupingMemberId));
    setTotal((prev) => prev - 1);
  };

  if (!auth || loadingAuth) return <LoadingSpinner title="Loading..." message="Authenticating user." />;
  if (auth.role !== RoleEnum.ADMIN) return <AccessDenied message="ADMIN rights required." />;

  return (
    <AdminMasterDetail
      title="Grouping Members"
      breadcrumbItems={[{ label: "Home", href: "/" }, { label: "Admin", href: "/admin" }, { label: "Grouping Members" }]}
      items={items}
      total={total}
      currentPage={page}
      pageCount={pageCount}
      onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
      onNextPage={() => setPage((p) => Math.min(pageCount, p + 1))}
      loading={loading}
      error={error}
      getItemId={(i) => i.groupingMemberId}
      getItemLabel={(i) => `${i.entityId} ∈ ${i.groupingId}`}
      getSearchText={(i) => [String(i.entityId), String(i.groupingId)].join(" ")}
      renderDetail={(i) => (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="groupingMemberId">{i.groupingMemberId}</Field>
          <Field label="entityId">{i.entityId}</Field>
          <Field label="groupingId">{i.groupingId}</Field>
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
      getDeleteTitle={(i) => `Delete grouping member #${i.groupingMemberId}?`}
      getDeleteDescription={(i) => `This will permanently delete the membership of entity ${i.entityId} in grouping ${i.groupingId}. This action cannot be undone.`}
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
