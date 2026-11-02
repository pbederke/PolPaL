"use client";

import { formatPartialDate } from "@/lib/shared/utils";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight, List, SlidersHorizontal, X } from "lucide-react";
import SearchInput from "@/components/ui/SearchInput";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import CountryFlag from "@/components/ui/DisplayFlags";

interface Entry {
  entryId: number;
  countrycodePolpal: string;
  countryname: string | null;
  iso2c: string | null;
  entryCountry: string | null;
  entryYear: number | null;
  entryMonth: number | null;
  entryDay: number | null;
  entryEntityIdVar: string;
  entryEntityId: string;
  entryEntityNameShort: string | null;
  entryEntityNameEnglish: string | null;
  entryEntityName: string | null;
  uniqueObservationId: string;
  projectNameShort: string;
  projectName: string;
  datasetNameShort: string;
  datasetName: string;
  version: string;
  versionName: string;
  linkCount: number;
}

const PAGE_SIZE = 100;

export default function VersionEntriesClient() {
  const params = useParams();
  const router = useRouter();
  const projectKey = params.projectKey as string;
  const datasetKey = params.datasetKey as string;
  const versionKey = params.versionKey as string;

  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [filterYearFrom, setFilterYearFrom] = useState<string>("");
  const [filterYearTo, setFilterYearTo] = useState<string>("");
  const [filterCountry, setFilterCountry] = useState<string>("");
  const [filterLinked, setFilterLinked] = useState<"all" | "linked" | "unlinked">("all");
  const [filterIdVar, setFilterIdVar] = useState<string>("");

  function handleSearch(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 150);
  }

  useEffect(() => {
    const abortController = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/entries/${versionKey}/entries`,
          { credentials: "include", signal: abortController.signal }
        );
        if (!res.ok) throw new Error(await res.text());
        setAllEntries(await res.json());
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!abortController.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => abortController.abort();
  }, [versionKey]);

  const filtered = useMemo(() => {
    let result = allEntries;

    const q = debouncedSearch.toLowerCase().trim();
    if (q) {
      result = result.filter((e) =>
        e.countrycodePolpal.toLowerCase().includes(q) ||
        (e.countryname?.toLowerCase().includes(q) ?? false) ||
        e.entryEntityIdVar.toLowerCase().includes(q) ||
        e.entryEntityId.toLowerCase().includes(q) ||
        (e.entryEntityNameShort?.toLowerCase().includes(q) ?? false) ||
        (e.entryEntityNameEnglish?.toLowerCase().includes(q) ?? false) ||
        (e.entryEntityName?.toLowerCase().includes(q) ?? false) ||
        (e.entryCountry?.toLowerCase().includes(q) ?? false) ||
        (e.entryYear ? e.entryYear.toString().includes(q) : false)
      );
    }

    if (filterYearFrom) {
      const y = parseInt(filterYearFrom, 10);
      result = result.filter((e) => e.entryYear != null && e.entryYear >= y);
    }
    if (filterYearTo) {
      const y = parseInt(filterYearTo, 10);
      result = result.filter((e) => e.entryYear != null && e.entryYear <= y);
    }
    if (filterCountry) {
      result = result.filter((e) => e.countrycodePolpal === filterCountry);
    }
    if (filterLinked === "linked") {
      result = result.filter((e) => e.linkCount > 0);
    } else if (filterLinked === "unlinked") {
      result = result.filter((e) => e.linkCount === 0);
    }
    if (filterIdVar.trim()) {
      result = result.filter((e) => e.entryEntityIdVar === filterIdVar);
    }

    return result;
  }, [allEntries, debouncedSearch, filterYearFrom, filterYearTo, filterCountry, filterLinked, filterIdVar]);

  const countryOptions = useMemo(() => {
    const seen = new Map<string, string>();
    allEntries.forEach((e) => {
      if (!seen.has(e.countrycodePolpal)) seen.set(e.countrycodePolpal, e.countryname ?? e.countrycodePolpal);
    });
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [allEntries]);

  const idVarOptions = useMemo(() => {
    const seen = new Set<string>();
    allEntries.forEach((e) => seen.add(e.entryEntityIdVar));
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [allEntries]);

  const linkedCount = allEntries.filter((e) => e.linkCount > 0).length;
  const unlinkedCount = allEntries.length - linkedCount;

  const activeFilterCount = [
    debouncedSearch.trim(),
    filterYearFrom,
    filterYearTo,
    filterCountry,
    filterLinked !== "all" ? filterLinked : "",
    filterIdVar.trim(),
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch(""); setDebouncedSearch("");
    setFilterYearFrom(""); setFilterYearTo("");
    setFilterCountry(""); setFilterLinked("all"); setFilterIdVar("");
    setPage(1);
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageEntries = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filtered.length);

  if (loading) {
    return (
      <LoadingSpinner
        title="Loading entries..."
        message={<>Loading entries for <em>{versionKey}</em></>}
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        message={<>Failed to load entries for <em>{versionKey}</em>.</>}
        error={error}
        backHref={`/data/projects/${projectKey}/${datasetKey}/${versionKey}`}
        backLabel="Back to Version"
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Projects", href: "/data/projects" },
        { label: allEntries[0]?.projectName ?? projectKey, href: `/data/projects/${projectKey}` },
        { label: allEntries[0]?.datasetNameShort ?? datasetKey, href: `/data/projects/${projectKey}/${datasetKey}` },
        { label: allEntries[0]?.version ?? versionKey, href: `/data/projects/${projectKey}/${datasetKey}/${versionKey}` },
        { label: "All External Entries" },
      ]} />

      {/* Page Header */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <div className="rounded-xl p-3 bg-blue-50 text-blue-600 shrink-0">
              <List className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 leading-tight">
                All External Entries: {allEntries[0]?.projectNameShort ?? projectKey} &mdash; {allEntries[0]?.datasetNameShort ?? datasetKey} &mdash; {allEntries[0]?.version ?? versionKey}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">{projectKey} / {datasetKey} / {versionKey}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-blue-600">{allEntries.length.toLocaleString()}</div>
              <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Total</div>
            </div>
            <div className="w-px h-8 sm:h-10 bg-gray-200" />
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-green-600">{linkedCount.toLocaleString()}</div>
              <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Linked</div>
            </div>
            <div className="w-px h-8 sm:h-10 bg-gray-200" />
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-amber-500">{unlinkedCount.toLocaleString()}</div>
              <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Unlinked</div>
            </div>
            {activeFilterCount > 0 && (
              <>
                <div className="w-px h-8 sm:h-10 bg-gray-200" />
                <div className="text-center">
                  <div className="text-lg sm:text-2xl font-bold text-gray-600">{filtered.length.toLocaleString()}</div>
                  <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Filtered</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <SlidersHorizontal className="w-4 h-4 text-gray-500" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary text-white">{activeFilterCount}</span>
            )}
          </div>
          {activeFilterCount > 0 && (
            <button type="button" onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium">
              <X className="w-3.5 h-3.5" /> Clear all
            </button>
          )}
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Search</label>
            <SearchInput value={search} onChange={handleSearch} placeholder="Search…" className="w-full" size="sm" />
          </div>
          {/* Year from */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Year from</label>
            <input
              type="number"
              value={filterYearFrom}
              onChange={(e) => { setFilterYearFrom(e.target.value); setPage(1); }}
              placeholder="e.g. 2010"
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {/* Year to */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Year to</label>
            <input
              type="number"
              value={filterYearTo}
              onChange={(e) => { setFilterYearTo(e.target.value); setPage(1); }}
              placeholder="e.g. 2024"
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {/* ID Var */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">ID Var</label>
            <select
              value={filterIdVar}
              onChange={(e) => { setFilterIdVar(e.target.value); setPage(1); }}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            >
              <option value="">All ID vars</option>
              {idVarOptions.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          {/* Country */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">PolPaL Country</label>
            <select
              value={filterCountry}
              onChange={(e) => { setFilterCountry(e.target.value); setPage(1); }}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            >
              <option value="">All countries</option>
              {countryOptions.map(([code, name]) => (
                <option key={code} value={code}>{name} ({code})</option>
              ))}
            </select>
          </div>
          {/* Links */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Links</label>
            <select
              value={filterLinked}
              onChange={(e) => { setFilterLinked(e.target.value as "all" | "linked" | "unlinked"); setPage(1); }}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            >
              <option value="all">All</option>
              <option value="linked">Linked</option>
              <option value="unlinked">Unlinked</option>
            </select>
          </div>
        </div>
        {/* Active filter pills */}
        {activeFilterCount > 0 && (
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            {debouncedSearch.trim() && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                Search: &ldquo;{debouncedSearch}&rdquo;
                <button onClick={() => { setSearch(""); setDebouncedSearch(""); setPage(1); }} aria-label="Clear search filter"><X className="w-3 h-3" aria-hidden="true" /></button>
              </span>
            )}
            {filterYearFrom && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                From: {filterYearFrom}
                <button onClick={() => { setFilterYearFrom(""); setPage(1); }} aria-label="Clear year from filter"><X className="w-3 h-3" aria-hidden="true" /></button>
              </span>
            )}
            {filterYearTo && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                To: {filterYearTo}
                <button onClick={() => { setFilterYearTo(""); setPage(1); }} aria-label="Clear year to filter"><X className="w-3 h-3" aria-hidden="true" /></button>
              </span>
            )}
            {filterIdVar && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                ID Var: {filterIdVar}
                <button onClick={() => { setFilterIdVar(""); setPage(1); }} aria-label="Clear ID variable filter"><X className="w-3 h-3" aria-hidden="true" /></button>
              </span>
            )}
            {filterCountry && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                Country: {filterCountry}
                <button onClick={() => { setFilterCountry(""); setPage(1); }} aria-label="Clear country filter"><X className="w-3 h-3" aria-hidden="true" /></button>
              </span>
            )}
            {filterLinked !== "all" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {filterLinked === "linked" ? "Linked only" : "Unlinked only"}
                <button onClick={() => { setFilterLinked("all"); setPage(1); }} aria-label="Clear linked filter"><X className="w-3 h-3" aria-hidden="true" /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        {/* Table toolbar */}
        <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
          <span className="text-xs text-gray-500">
            {filtered.length === 0
              ? "No external entries"
              : activeFilterCount > 0
                ? `${filtered.length.toLocaleString()} of ${allEntries.length.toLocaleString()} external entries`
                : `${allEntries.length.toLocaleString()} external entries`}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center px-2 py-1 text-xs border rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-gray-600 tabular-nums font-medium">
                {page} / {totalPages}
              </span>
              <button
                className="inline-flex items-center px-2 py-1 text-xs border rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-[11px] leading-tight">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-[11px] uppercase tracking-wide text-gray-500 w-36">PolPaL Country</th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-[11px] uppercase tracking-wide text-gray-500 w-36">Dataset Country</th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-[11px] uppercase tracking-wide text-gray-500 w-24">Date</th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-[11px] uppercase tracking-wide text-gray-500 w-36">ID (Var)</th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-[11px] uppercase tracking-wide text-gray-500 w-36">ID</th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-[11px] uppercase tracking-wide text-gray-500">Name Short</th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-[11px] uppercase tracking-wide text-gray-500">Name English</th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-[11px] uppercase tracking-wide text-gray-500">Name</th>
                <th scope="col" className="px-4 py-3 text-center font-semibold text-[11px] uppercase tracking-wide text-gray-500 w-16">Links</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="text-gray-400 font-medium">No external entries match the current filters.</div>
                    {activeFilterCount > 0 && (
                      <button onClick={clearFilters} className="mt-2 text-xs text-primary hover:underline">Clear filters</button>
                    )}
                  </td>
                </tr>
              ) : (
                pageEntries.map((e) => (
                  <tr key={e.entryId} className="hover:bg-blue-50/40 cursor-pointer transition-colors" onClick={() => router.push(`/data/entries/${e.entryId}`)}>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <CountryFlag
                          iso2c={e.iso2c}
                          countrycodePolpal={e.countrycodePolpal}
                          countryname={e.countryname ?? e.countrycodePolpal}
                          size={16}
                        />
                        <span className="text-gray-700">{e.countrycodePolpal}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      {e.entryCountry ? (
                        <span className="text-gray-700">{e.entryCountry}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-600 tabular-nums">{formatPartialDate(e.entryYear, e.entryMonth, e.entryDay)}</td>
                    <td className="px-4 py-2 font-mono text-gray-600">{e.entryEntityIdVar}</td>
                    <td className="px-4 py-2 font-mono text-gray-600">{e.entryEntityId}</td>
                    <td className="px-4 py-2 text-gray-700">{e.entryEntityNameShort}</td>
                    <td className="px-4 py-2 text-gray-700">{e.entryEntityNameEnglish}</td>
                    <td className="px-4 py-2 text-gray-700">{e.entryEntityName}</td>
                    <td className="px-4 py-2 text-center">
                      {e.linkCount > 0 ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                          {e.linkCount}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-200">
            <span className="text-xs text-gray-500">
              Showing {rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()} of {filtered.length.toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center px-2 py-1 text-xs border rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-gray-600 tabular-nums font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                className="inline-flex items-center px-2 py-1 text-xs border rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
