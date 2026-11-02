"use client";

import { useEffect, useState, useMemo } from "react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import SearchInput from "@/components/ui/SearchInput";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

// =====================
// Types
// =====================

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminMasterDetailProps<T> {
  title: string;
  breadcrumbItems: BreadcrumbItem[];
  items: T[];
  total: number;
  currentPage: number;
  pageCount: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  loading: boolean;
  error: string | null;
  getItemId: (item: T) => string | number;
  getItemLabel: (item: T) => string;
  getSearchText: (item: T) => string;
  renderDetail: (item: T) => React.ReactNode;
  onDelete?: (item: T, comment?: string) => Promise<void>;
  getDeleteTitle?: (item: T) => string;
  getDeleteDescription?: (item: T) => string;
  withDeleteComment?: boolean;
  headerAction?: React.ReactNode;
}

// =====================
// Component
// =====================

export default function AdminMasterDetail<T>({
  title,
  breadcrumbItems,
  items,
  total,
  currentPage,
  pageCount,
  onPrevPage,
  onNextPage,
  loading,
  error,
  getItemId,
  getItemLabel,
  getSearchText,
  renderDetail,
  onDelete,
  getDeleteTitle,
  getDeleteDescription,
  withDeleteComment,
  headerAction,
}: AdminMasterDetailProps<T>) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [confirmItem, setConfirmItem] = useState<T | null>(null);
  const [deleteComment, setDeleteComment] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Reset selection when items change (page navigation)
  useEffect(() => {
    setSelectedId(null);
  }, [items]);

  // Reset search when items change (page navigation)
  useEffect(() => {
    setSearch("");
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const s = search.toLowerCase();
    return items.filter((item) => getSearchText(item).toLowerCase().includes(s));
  }, [items, search, getSearchText]);

  const selectedItem = useMemo(
    () => items.find((item) => getItemId(item) === selectedId) ?? null,
    [items, selectedId, getItemId]
  );

  const handleDeleteClick = (item: T) => {
    setConfirmItem(item);
    setDeleteComment("");
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmItem || !onDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(confirmItem, withDeleteComment ? deleteComment : undefined);
      setConfirmItem(null);
      setDeleteComment("");
      setSelectedId(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  // Close delete modal on Escape
  useEffect(() => {
    if (!confirmItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) {
        setConfirmItem(null);
        setDeleteError(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [confirmItem, deleting]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Breadcrumbs items={breadcrumbItems} />

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{title}</h1>
          <p className="text-gray-500">{total.toLocaleString()} total records</p>
        </div>
        {headerAction && <div>{headerAction}</div>}
      </div>

      {/* Master-Detail layout */}
      <div className="flex gap-4 items-start">
        {/* Left panel */}
        <div className="w-72 flex-none bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col">
          <div className="p-3 border-b border-gray-100">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Filter this page..."
              className="w-full"
              size="sm"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
              Loading…
            </div>
          ) : error ? (
            <div role="alert" className="p-4 text-sm text-red-500">{error}</div>
          ) : filteredItems.length === 0 ? (
            <div className="p-4 text-sm text-gray-400">No entries found.</div>
          ) : (
            <ul className="h-[calc(100vh-340px)] overflow-y-auto divide-y divide-gray-50">
              {filteredItems.map((item) => {
                const id = getItemId(item);
                const isSelected = id === selectedId;
                return (
                  <li key={id}>
                    <button
                      onClick={() => setSelectedId(isSelected ? null : id)}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors truncate ${
                        isSelected
                          ? "bg-primary text-white"
                          : "hover:bg-gray-50 text-gray-700"
                      }`}
                      title={`#${id} — ${getItemLabel(item)}`}
                    >
                      <span className="font-mono text-gray-400 mr-1">{isSelected ? <span className="text-white/70">#{id}</span> : `#${id}`}</span>
                      {" — "}
                      <span className="truncate">{getItemLabel(item)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Page navigation */}
          <div className="border-t border-gray-100 px-3 py-2 flex items-center justify-between text-xs text-gray-500">
            <button
              onClick={onPrevPage}
              disabled={currentPage <= 1 || loading}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Previous page"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <span>Page {currentPage} of {Math.max(1, pageCount)}</span>
            <button
              onClick={onNextPage}
              disabled={currentPage >= pageCount || loading}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Next page"
              aria-label="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 min-w-0">
          {selectedItem === null ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
              <p className="text-gray-400 text-sm">Select an entry to view details</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
              {renderDetail(selectedItem)}
              {onDelete && (
                <div className="pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleDeleteClick(selectedItem)}
                    className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete this record
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {confirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" aria-hidden="true">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 space-y-4"
          >
            <h2 id="delete-dialog-title" className="text-lg font-semibold text-gray-900">
              {getDeleteTitle ? getDeleteTitle(confirmItem) : "Delete record?"}
            </h2>
            <p className="text-sm text-gray-600">
              {getDeleteDescription
                ? getDeleteDescription(confirmItem)
                : "This action cannot be undone."}
            </p>
            {withDeleteComment && (
              <div>
                <label htmlFor="delete-comment" className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for deletion <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  id="delete-comment"
                  value={deleteComment}
                  onChange={(e) => setDeleteComment(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Add a note that will be saved in the changelog…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>
            )}
            {deleteError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3" role="alert">{deleteError}</p>
            )}
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => { setConfirmItem(null); setDeleteError(null); }}
                disabled={deleting}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
