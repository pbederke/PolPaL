"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import SearchInput from "@/components/ui/SearchInput";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import PaginationControls from "@/components/ui/PaginationControls";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { ButtonAdd, ButtonDelete, ButtonUpdate } from "@/components/ui/Buttons";
import { ExternalLink } from "lucide-react";

interface News {
  newsId: number;
  title: string;
  content: string;
  links: string[] | null;
  publishedPublicAt: string;
  updatedPublicAt: string;
  authorId: number;
  authorIdOriginal: number;
}

export default function NewsPage() {
  const { auth } = useAuth();
  const [news, setNews] = useState<News[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleteComment, setDeleteComment] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {

    const controller = new AbortController();
    async function fetchNews() {
      setLoadingNews(true);
      setError(null);

      try {
        const res = await fetch(`/api/news/`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to load news.");
        const data = await res.json();
        setNews(data);
      } catch (err: unknown) {
        if (!(err instanceof Error) || err.name === 'AbortError') return;
        console.error(err);
        setError(err instanceof Error ? err.message : "Error fetching news.");
      } finally {
        setLoadingNews(false);
      }
    }

    fetchNews();
    return () => controller.abort();
  }, []);

  // Handler for deleting news entries (ADMIN and DATAMANAGER roles)
  const handleDeleteNews = (newsId: number) => {
    setDeleteComment("");
    setDeleteError(null);
    setDeleteTarget(newsId);
  };

  const handleDeleteNewsConfirm = async () => {
    if (deleteTarget === null) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const comment = deleteComment.trim();
      const res = await fetch(`/api/news/${deleteTarget}`, {
        method: "DELETE",
        credentials: "include",
        ...(comment ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ comment }) } : {}),
      });
      if (!res.ok) throw new Error(await res.text());
      setNews((prev) => prev ? prev.filter((n) => n.newsId !== deleteTarget) : prev);
      setDeleteTarget(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleteLoading(false);
    }
  };

  // ---- SORT by publishedPublicAt ----
  const sortedNews = useMemo(() => {
    return [...news].sort((a, b) => new Date(b.publishedPublicAt).getTime() - new Date(a.publishedPublicAt).getTime());
  }, [news]);

  // ---- FILTER by search ----
  const filteredNews = useMemo(() => {
    const s = search.toLowerCase();
    return sortedNews.filter((i) =>
      [i.title, i.content, ...(i.links || [])].some((f) =>
        f?.toLowerCase().includes(s)
      )
    );
  }, [sortedNews, search]);

  // Pagination values
  const pageCount = Math.ceil(filteredNews.length / pageSize);

  const paginatedNews = useMemo(() => {
    return filteredNews.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [filteredNews, currentPage]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Render loading state
  if (loadingNews) {
    return <LoadingSpinner title="Loading news..." message="Fetching news. Please wait a moment." />;
  }

  // Render error state
  if (error) {
    return <ErrorState message="We encountered an issue while loading the news." error={error} backHref="/" />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Documentation" },
        { label: "News" },
      ]} />

      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">News</h1>
            <p className="text-lg text-gray-600">All news entries in PolPaL</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center gap-3 flex-1">
            <div className="bg-green-100 rounded-lg p-3 shrink-0">
              <svg aria-hidden="true" className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" clipRule="evenodd" />
                <path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">All News Entries</h2>
              <p className="text-sm text-gray-600">
                {filteredNews.length === news?.length
                  ? `All ${filteredNews.length} news entr${filteredNews.length !== 1 ? 'ies' : 'y'}`
                  : `Showing ${filteredNews.length} of ${news.length} news entr${news.length !== 1 ? 'ies' : 'y'}`}
              </p>
            </div>
          </div>

          {/* Search and Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search news..." />
            {["ADMIN", "DATAMANAGER"].includes(auth.role ?? "") && (
              <ButtonAdd
                text=""
                href="/manage/news/create"
                ariaLabel="Add News Entry"
              />
            )}
          </div>
        </div>

        {error && <div role="alert" className="text-red-600 mb-4">{error}</div>}

        {filteredNews.length === 0 ? (
          <p className="text-gray-600">No news found.</p>
        ) : (
          <>
            {/* News Cards */}
            <div className="space-y-6">
              {paginatedNews.map((newsItem) => (
                <article
                  key={newsItem.newsId}
                  className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group"
                >
                  {/* Header Section */}
                  <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-primary transition-colors duration-200">
                          {newsItem.title}
                        </h2>
                      </div>
                      {/* Publication Dates */}
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div>
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Published
                            </span>
                            <p className="text-sm font-semibold text-gray-900">
                              {newsItem.publishedPublicAt ? (
                                new Date(newsItem.publishedPublicAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              ) : (
                                <span className="text-gray-400 italic font-normal">Not published</span>
                              )}
                            </p>
                          </div>
                        </div>
                        {newsItem.updatedPublicAt && (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                            <div>
                              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Updated
                              </span>
                              <p className="text-sm font-semibold text-gray-900">
                                {new Date(newsItem.updatedPublicAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                          </div>
                        )}
                        {(auth.role === "ADMIN" || auth.role === "DATAMANAGER") && (
                          <div className="flex items-center gap-1">
                            <div className="scale-75">
                              <ButtonUpdate
                                href={`/manage/news/update/${newsItem.newsId}`}
                                ariaLabel="Edit news article"
                              />
                            </div>
                            <div className="scale-75">
                              <ButtonDelete
                                onClick={() => handleDeleteNews(newsItem.newsId)}
                                ariaLabel="Delete news article"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="px-6 py-5">
                    <div className="prose prose-gray max-w-none">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-justify">
                        {newsItem.content}
                      </p>
                    </div>
                  </div>

                  {/* Links Section */}
                  {newsItem.links && newsItem.links.length > 0 && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-800 mb-2">Related Links</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {newsItem.links.map((link, index) => (
                          <li key={index}>
                            <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                              {link}
                              <ExternalLink className="inline-block w-3.5 h-3.5 ml-1 scale-80" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              ))}
            </div>

            <PaginationControls
              currentPage={currentPage}
              pageCount={pageCount}
              onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
              onNext={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
            />
          </>
        )}
      </div>

      {deleteTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title"
            className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 space-y-4">
            <h2 id="delete-dialog-title" className="text-lg font-semibold text-gray-900">Delete news entry?</h2>
            <p className="text-sm text-gray-600">This will permanently delete this news entry. This action cannot be undone.</p>
            <div>
              <label htmlFor="delete-comment" className="block text-sm font-medium text-gray-700 mb-1">Reason for deletion <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea id="delete-comment" value={deleteComment} onChange={(e) => setDeleteComment(e.target.value)} rows={3} maxLength={1000}
                placeholder="Add a note that will be saved in the changelog…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                disabled={deleteLoading} />
            </div>
            {deleteError && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3" role="alert">{deleteError}</p>}
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => { setDeleteTarget(null); setDeleteError(null); }} disabled={deleteLoading}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">Cancel</button>
              <button onClick={handleDeleteNewsConfirm} disabled={deleteLoading}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deleteLoading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
