"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { RoleEnum } from "@/lib/shared/enums";
import AdminMasterDetail from "@/components/admin/AdminMasterDetail";

interface News {
  newsId: number;
  title: string;
  content: string;
  links: unknown | null;
  publishedPublicAt: string;
  updatedPublicAt: string | null;
  createdAt: string;
  updatedAt: string;
  userId: number | null;
}

export default function AdminNewsPage() {
  const { auth, loadingAuth } = useAuth();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<News[]>([]);
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
      fetch(`/api/admin/news?page=${page}`, { credentials: "include", signal: controller.signal })
        .then((res) => { if (!res.ok) throw new Error("Failed to load news."); return res.json(); })
        .then(({ items, total, pageCount }: { items: News[]; total: number; pageCount: number }) => { setItems(items); setTotal(total); setPageCount(pageCount); })
        .catch((err: unknown) => { if (err instanceof Error && err.name === "AbortError") return; setError(err instanceof Error ? err.message : "Error fetching news."); })
        .finally(() => setLoading(false));
    };
    load();
    return () => controller.abort();
  }, [auth.loggedIn, auth.role, loadingAuth, page]);

  if (!auth || loadingAuth) return <LoadingSpinner title="Loading..." message="Authenticating user." />;
  if (auth.role !== RoleEnum.ADMIN) return <AccessDenied message="ADMIN rights are required to view and manage news." />;

  return (
    <AdminMasterDetail
      title="News"
      breadcrumbItems={[{ label: "Home", href: "/" }, { label: "Admin", href: "/admin" }, { label: "News" }]}
      items={items}
      total={total}
      currentPage={page}
      pageCount={pageCount}
      onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
      onNextPage={() => setPage((p) => Math.min(pageCount, p + 1))}
      loading={loading}
      error={error}
      getItemId={(i) => i.newsId}
      getItemLabel={(i) => i.title}
      getSearchText={(i) => [i.title, i.content].join(" ")}
      renderDetail={(i) => (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="newsId">{i.newsId}</Field>
          <Field label="userId">{i.userId ?? "—"}</Field>
          <Field label="title" className="sm:col-span-2">{i.title}</Field>
          <Field label="content" className="sm:col-span-2">
            <p className="whitespace-pre-wrap text-sm text-gray-700 leading-snug">{i.content}</p>
          </Field>
          <Field label="links" className="sm:col-span-2">{i.links ? JSON.stringify(i.links) : "—"}</Field>
          <Field label="publishedPublicAt">{new Date(i.publishedPublicAt).toLocaleDateString()}</Field>
          <Field label="updatedPublicAt">{i.updatedPublicAt ? new Date(i.updatedPublicAt).toLocaleDateString() : "—"}</Field>
          <Field label="createdAt">{new Date(i.createdAt).toLocaleDateString()}</Field>
          <Field label="updatedAt">{new Date(i.updatedAt).toLocaleDateString()}</Field>
        </dl>
      )}
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
