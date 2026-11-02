"use client";

import Breadcrumbs from "@/components/ui/Breadcrumbs";
import SearchInput from "@/components/ui/SearchInput";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { RoleEnum, TableNamesEnum } from "@/lib/shared/enums";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ChangelogInternal {
  changelogId: number;
  tableName: TableNamesEnum;
  recordId: number;
  recordName: string;
  action: "CREATED" | "UPDATED" | "DELETED";
  field?: string;
  oldValue?: string;
  newValue?: string;
  comment?: string;
  batchId?: string;
  userId: number;
  changedAt: string;
}

const PAGE_SIZE = 100;

const colorMap = {
  created: { title: "text-green-700", badge: "bg-green-100 text-green-800" },
  updated: { title: "text-yellow-700", badge: "bg-yellow-100 text-yellow-800" },
  deleted: { title: "text-red-700",   badge: "bg-red-100 text-red-800" },
};

interface Props {
  action: "created" | "updated" | "deleted";
}

export default function AdminChangelogSectionClient({ action }: Props) {
  const { auth, loadingAuth } = useAuth();
  const isAdmin = !loadingAuth && auth.loggedIn && auth.role === RoleEnum.ADMIN;

  const [tableNames, setTableNames] = useState<string[]>([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string>("");

  const [items, setItems] = useState<ChangelogInternal[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [fieldFilter, setFieldFilter] = useState<string>("");

  // Step 1: load the list of tables that have entries for this action.
  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();

    const loadTables = async () => {
      setTablesLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/changelog/${action}`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { tableNames }: { tableNames: string[] } = await res.json();
        setTableNames(tableNames);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Error fetching tables.");
      } finally {
        setTablesLoading(false);
      }
    };

    loadTables();
    return () => controller.abort();
  }, [action, isAdmin]);

  // Step 2: once a table is selected, load ALL of its changelog rows for this action.
  useEffect(() => {
    if (!isAdmin || !selectedTable) {
      setItems([]);
      setTotal(0);
      return;
    }
    const controller = new AbortController();

    const loadLogs = async () => {
      setLoading(true);
      setError(null);
      setPage(1);
      try {
        const res = await fetch(
          `/api/admin/changelog/${action}?tableName=${encodeURIComponent(selectedTable)}`,
          { credentials: "include", signal: controller.signal },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { logs, totalCount }: { logs: ChangelogInternal[]; totalCount: number } = await res.json();
        setItems(logs);
        setTotal(totalCount);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Error fetching logs.");
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
    return () => controller.abort();
  }, [action, isAdmin, selectedTable]);

  const label = action.charAt(0).toUpperCase() + action.slice(1);
  const colors = colorMap[action];

  const fieldOptions = useMemo(() => {
    const seen = new Set<string>();
    items.forEach((log) => { if (log.field) seen.add(log.field); });
    return Array.from(seen).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return items.filter((log) => {
      if (fieldFilter && log.field !== fieldFilter) return false;
      if (!s) return true;
      return [log.changelogId, log.tableName, log.recordId, log.recordName, log.field, log.oldValue, log.newValue, log.comment, log.batchId, log.userId, log.changedAt && new Date(log.changedAt).toLocaleString()]
        .map((v) => (v == null ? "" : String(v).toLowerCase()))
        .some((v) => v.includes(s));
    });
  }, [items, search, fieldFilter]);

  // Client-side pagination over the fully-loaded, filtered rows.
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  useEffect(() => { setPage(1); }, [search, fieldFilter]);

  if (!auth || loadingAuth) return <LoadingSpinner title="Loading..." message="Authenticating user." />;
  if (auth.role !== RoleEnum.ADMIN) return <AccessDenied message="ADMIN rights are required to view the changelog." />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Admin", href: "/admin" }, { label: "Changelog", href: "/admin/changelog" }, { label: label }]} />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className={`text-2xl font-bold mb-1 ${colors.title}`}>{label}</h1>
            <p className="text-gray-500">
              {selectedTable
                ? <>{total.toLocaleString()} entries in <span className="font-mono">{selectedTable}</span>{filtered.length !== items.length && ` · ${filtered.length} matching filters`}</>
                : "Select a table to load its changelog"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              disabled={tablesLoading}
              className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">{tablesLoading ? "Loading tables…" : "Select a table…"}</option>
              {tableNames.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {selectedTable && (
              <>
                <select
                  value={fieldFilter}
                  onChange={(e) => setFieldFilter(e.target.value)}
                  className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All fields</option>
                  {fieldOptions.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                <SearchInput value={search} onChange={setSearch} placeholder="Search…" />
                {(fieldFilter || search) && (
                  <button
                    onClick={() => { setFieldFilter(""); setSearch(""); }}
                    className="text-xs text-gray-500 hover:text-gray-800 underline whitespace-nowrap"
                  >
                    Clear filters
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        {!selectedTable ? (
          <p className="text-sm text-gray-500">
            {tablesLoading
              ? "Loading available tables…"
              : tableNames.length === 0
                ? "No changelog entries for this action yet."
                : "Choose a table from the dropdown above to view its changelog entries."}
          </p>
        ) : loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : error ? (
          <ErrorState message={error} />
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-500">No entries found.</p>
        ) : (
          <>
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    {["changelogId", "tableName", "recordId", "recordName", "field", "oldValue", "newValue", "comment", "batchId", "userId", "changedAt"].map((h) => (
                      <th key={h} scope="col" className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {pageItems.map((log) => (
                    <tr key={log.changelogId} className="hover:bg-gray-50">
                      <td className="px-2 py-1">{log.changelogId}</td>
                      <td className="px-2 py-1 whitespace-nowrap">{log.tableName}</td>
                      <td className="px-2 py-1">{log.recordId}</td>
                      <td className="px-2 py-1 max-w-[130px] truncate" title={log.recordName}>{log.recordName}</td>
                      <td className="px-2 py-1 max-w-[90px] truncate" title={log.field ?? ""}>{log.field ?? "—"}</td>
                      <td className="px-2 py-1 max-w-[90px] truncate text-gray-500" title={log.oldValue ?? ""}>{log.oldValue ?? "—"}</td>
                      <td className="px-2 py-1 max-w-[90px] truncate" title={log.newValue ?? ""}>{log.newValue ?? "—"}</td>
                      <td className="px-2 py-1 max-w-[110px] truncate italic" title={log.comment ?? ""}>{log.comment ?? "—"}</td>
                      <td className="px-2 py-1 max-w-[100px] truncate font-mono text-gray-500" title={log.batchId ?? ""}>{log.batchId ?? "—"}</td>
                      <td className="px-2 py-1">{log.userId}</td>
                      <td className="px-2 py-1 whitespace-nowrap">{new Date(log.changedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-3">
              <p className="text-sm text-gray-500">
                Page {page} of {pageCount} · {filtered.length.toLocaleString()}
                {filtered.length !== items.length ? ` filtered of ${items.length.toLocaleString()}` : ""} rows
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={page >= pageCount}
                  className="p-1.5 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
