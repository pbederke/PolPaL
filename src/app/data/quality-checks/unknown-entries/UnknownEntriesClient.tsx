"use client";

import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { useEffect, useMemo, useState } from "react";
import { Filter, HelpCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import NotFoundState from "@/components/ui/NotFoundState";
import SearchInput from "@/components/ui/SearchInput";
import Link from "next/link";
import PaginationControls from "@/components/ui/PaginationControls";
import { EntryCard } from "@/components/ui/EntryCard";
import CountryFlag from "@/components/ui/DisplayFlags";

interface UnknownEntry {
  projectKey: string;
  projectNameShort: string;
  projectName: string;
  datasetKey: string;
  datasetNameShort: string;
  datasetName: string;
  versionKey: string;
  version: string;
  versionName: string;
  entryId: number;
  entryYear: number | null;
  entryMonth: number | null;
  entryDay: number | null;
  entryEntityIdVar: string;
  entryEntityId: string;
  entryEntityNameShort: string | null;
  entryEntityNameEnglish: string | null;
  entryEntityName: string | null;
  countrycodePolpal: string;
  countryname: string | null;
  iso2c: string | null;
  uniqueObservationId: string;
  linkedPolpalId: number | null;
}

export default function UnknownEntriesClient() {

  // States for data
  const [unknownEntries, setUnknownEntries] = useState<UnknownEntry[] | null>(null);

  // Filter state
  const [search, setSearch] = useState<string>("");
  const [filterCountry, setFilterCountry] = useState<string>("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // State for loading and error handling
  const { auth } = useAuth();
  const isLoggedIn = !!auth?.userId;

  // State for loading and error handling 
  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState<string | null>(null);

  // Fetch dataset info on component mount and when datasetKey changes
  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    const fetchData = async () => {

      setLoadingData(true);
      setErrorData(null);

      try {
        // Fetch dataset info
        const unknownEntriesRes = await fetch(
          `/api/entries/unknown-entries`,
          {
            credentials: "include",
            signal,
          }
        );
        if (unknownEntriesRes.status === 401) return;
        if (!unknownEntriesRes.ok) throw new Error(await unknownEntriesRes.text());
        const unknownEntriesData: UnknownEntry[] = await unknownEntriesRes.json();

        if (!unknownEntriesData) {
          throw new Error("Unknown entries not found or you don't have permission to view them.");
        }

        setUnknownEntries(unknownEntriesData);

      } catch (err: unknown) {
        // Don't set error state if the request was aborted
        if (err instanceof Error && err.name !== 'AbortError') {
          setErrorData(err instanceof Error ? err.message : String(err));
        }
      } finally {
        // Only set loading to false if not aborted
        if (!abortController.signal.aborted) {
          setLoadingData(false);
        }
      }
    }

    fetchData();

    // Cleanup function to abort the request
    return () => {
      abortController.abort();
    };
  }, []);

  // Derived filter options
  const availableCountries = useMemo(() => {
    if (!unknownEntries) return [];
    const seen = new Map<string, string>();
    for (const entry of unknownEntries) {
      if (!seen.has(entry.countrycodePolpal)) {
        seen.set(entry.countrycodePolpal, entry.countryname ?? entry.countrycodePolpal);
      }
    }
    return Array.from(seen.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [unknownEntries]);

  const filteredEntries = useMemo(() => {
    if (!unknownEntries) return [];
    const lower = search.trim().toLowerCase();
    return unknownEntries.filter((entry) => {
      if (filterCountry && entry.countrycodePolpal !== filterCountry) return false;
      if (lower) {
        return (
          entry.countrycodePolpal.toLowerCase().includes(lower) ||
          entry.entryEntityId.toLowerCase().includes(lower) ||
          entry.entryEntityNameShort?.toLowerCase().includes(lower) ||
          entry.entryEntityNameEnglish?.toLowerCase().includes(lower) ||
          entry.entryEntityName?.toLowerCase().includes(lower) ||
          entry.projectNameShort.toLowerCase().includes(lower) ||
          entry.datasetNameShort.toLowerCase().includes(lower)
        );
      }
      return true;
    });
  }, [unknownEntries, search, filterCountry]);

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [search, filterCountry]);

  const pageCount = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const pagedEntries = filteredEntries.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Render loading state
  if (loadingData) {
    return <LoadingSpinner title="Loading unknown entries..." message={<>Fetching unknown entries. Please wait a moment.</>} />;
  }

  // Render error state
  if (errorData) {
    return <ErrorState message={<>We encountered an issue while loading unknown entries.</>} error={errorData} backHref="/" backLabel="Back to Homepage" />;
  }

  if ((!unknownEntries && !loadingData) || (!isLoggedIn)) {
    return (
      <NotFoundState
        title="Unknown Entries Not Found"
        message={<>No unknown entries could be found or you don&apos;t have permission to view them.</>}
        backHref="/"
        backLabel="Back to Homepage"
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Quality Checks", href: "/data/quality-checks" },
        { label: "Unknown Entries" },
      ]} />

      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
              Quality Check: Unknown Entries
            </h1>
            <p className="text-gray-500 text-sm">
              Dataset entries linked to entities with the type &quot;UNKNOWN&quot;.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-center min-w-[10rem]">
              <HelpCircle className="h-4 w-4 text-gray-500 mx-auto mb-1" />
              <span className="text-2xl font-bold text-gray-700 block">{unknownEntries?.length ?? 0}</span>
              <span className="text-xs text-gray-500">unknown entr{(unknownEntries?.length ?? 0) !== 1 ? "ies" : "y"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters panel */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">Filters</span>
            {(search || filterCountry) && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary">
                {[search, filterCountry].filter(Boolean).length} active
              </span>
            )}
          </div>
          {(search || filterCountry) && (
            <button
              type="button"
              onClick={() => { setSearch(""); setFilterCountry(""); }}
              className="text-xs text-gray-500 hover:text-red-600 underline underline-offset-2 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Search</label>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Dataset, ID, name..."
              className="w-full"
              size="sm"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Country</label>
            <select
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">All countries</option>
              {availableCountries.map(({ code, name }) => (
                <option key={code} value={code}>{name} ({code})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 mb-4">
            Showing <span className="font-medium text-gray-800">{filteredEntries.length}</span> of <span className="font-medium text-gray-800">{unknownEntries?.length ?? 0}</span> unknown entr{(unknownEntries?.length ?? 0) !== 1 ? "ies" : "y"}
          </p>
        </div>

        {/* Cards */}
        {!unknownEntries || unknownEntries.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <HelpCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No unknown entries found</h3>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-10 text-center">
            <h3 className="text-sm font-medium text-gray-900">No results match your filters</h3>
            <button
              type="button"
              onClick={() => { setSearch(""); setFilterCountry(""); }}
              className="mt-2 text-xs text-primary hover:underline"
            >Clear filters</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
              {pagedEntries.map((entry) => (
                <div key={entry.uniqueObservationId} className="flex flex-col overflow-hidden rounded-lg shadow-sm border border-gray-200 bg-white">

                  {/* Header strip */}
                  <div className="flex items-start justify-between gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
                    <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-gray-600 py-1">
                      <Link
                        href={`/data/countries/${entry.countrycodePolpal}`}
                        title={entry.countryname ?? entry.countrycodePolpal}
                        className="inline-flex items-center"
                      >
                        <CountryFlag
                          iso2c={entry.iso2c ?? undefined}
                          countrycodePolpal={entry.countrycodePolpal}
                          countryname={entry.countryname ?? entry.countrycodePolpal}
                          size={20}
                        />
                      </Link>
                      <span>
                        <span title={entry.projectName}>{entry.projectNameShort}</span>
                      </span>
                      <span>
                        <span title={entry.datasetName}>{entry.datasetNameShort}</span>
                      </span>
                      <span>
                        <span title={entry.versionName}>{entry.version}</span>
                      </span>
                    </div>
                    <Link
                      href={`/data/entries/${entry.entryId}`}
                      className="shrink-0 inline-flex items-center px-2 py-1 text-[11px] font-medium text-primary bg-white border border-primary rounded hover:bg-primary/5 transition-colors"
                    >
                      Review
                    </Link>
                  </div>

                  {/* EntryCard */}
                  <div className="p-3">
                    <EntryCard
                      entry={{
                        type: "single",
                        entryId: String(entry.entryId),
                        entryEntityIdVar: entry.entryEntityIdVar,
                        entryEntityId: entry.entryEntityId,
                        entryEntityNameShort: entry.entryEntityNameShort,
                        entryEntityNameEnglish: entry.entryEntityNameEnglish,
                        entryEntityName: entry.entryEntityName,
                        year: entry.entryYear,
                        month: entry.entryMonth,
                        day: entry.entryDay,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <PaginationControls
              currentPage={currentPage}
              pageCount={pageCount}
              onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
              onNext={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
              variant="simple"
            />
          </>
        )}
      </div>
    </div>
  );
}
