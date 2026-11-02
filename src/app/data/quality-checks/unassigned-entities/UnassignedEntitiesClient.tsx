"use client";

import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import NotFoundState from "@/components/ui/NotFoundState";
import SearchInput from "@/components/ui/SearchInput";
import { AllEntitiesCard, AllEntitiesCardData } from "@/components/ui/AllEntitesCard";

interface UnassignedEntities extends AllEntitiesCardData {
  isHidden: boolean;
  isHiddenReason: string | null;
  comment: string | null;
}

interface AllEntity {
  polpalId: number;
  isHidden: boolean;
}

const PAGE_SIZE = 100;

export default function UnassignedEntitiesClient() {

  const [unassignedEntities, setUnassignedEntities] = useState<UnassignedEntities[] | null>(null);
  const [allEntities, setAllEntities] = useState<AllEntity[]>([]);

  const [filterRegion, setFilterRegion] = useState<string>("");
  const [filterCountry, setFilterCountry] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);

  const { auth } = useAuth();
  const isLoggedIn = !!auth?.userId;

  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    const fetchData = async () => {
      setLoadingData(true);
      setErrorData(null);

      try {
        const [unassignedRes, allRes] = await Promise.all([
          fetch(`/api/entities/unassigned-entities/`, { credentials: "include", signal }),
          fetch(`/api/entities`, { credentials: "include", signal }),
        ]);
        if (unassignedRes.status === 401) return;
        if (!unassignedRes.ok) throw new Error(await unassignedRes.text());
        if (!allRes.ok) throw new Error(await allRes.text());

        const unassignedData: UnassignedEntities[] = await unassignedRes.json();
        const allData: AllEntity[] = await allRes.json();

        setUnassignedEntities(unassignedData);
        setAllEntities(allData);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setErrorData(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoadingData(false);
        }
      }
    }

    fetchData();
    return () => { abortController.abort(); };
  }, []);

  const availableRegions = useMemo(() => {
    if (!unassignedEntities) return [];
    const regions = new Set<string>();
    for (const entity of unassignedEntities) {
      for (const eic of entity.EntitiesInCountries) {
        if (eic.Countries.region) regions.add(eic.Countries.region);
      }
    }
    return Array.from(regions).sort();
  }, [unassignedEntities]);

  const availableCountries = useMemo(() => {
    if (!unassignedEntities) return [];
    const seen = new Map<string, string>();
    for (const entity of unassignedEntities) {
      for (const eic of entity.EntitiesInCountries) {
        if (!filterRegion || eic.Countries.region === filterRegion) {
          if (!seen.has(eic.Countries.countrycodePolpal)) {
            seen.set(eic.Countries.countrycodePolpal, eic.Countries.countryname ?? eic.Countries.countrycodePolpal);
          }
        }
      }
    }
    return Array.from(seen.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [unassignedEntities, filterRegion]);

  const filteredEntities = useMemo(() => {
    if (!unassignedEntities) return [];
    const lower = search.trim().toLowerCase();
    return unassignedEntities.filter((entity) => {
      if (filterCountry && !entity.EntitiesInCountries.some((eic) => eic.Countries.countrycodePolpal === filterCountry)) return false;
      if (filterRegion && !entity.EntitiesInCountries.some((eic) => eic.Countries.region === filterRegion)) return false;
      if (entity.isHidden) return false;
      if (lower) {
        const matchesEntityNames = entity.EntityNames?.some(
          (n) =>
            n.nameShort?.toLowerCase().includes(lower) ||
            n.name?.toLowerCase().includes(lower)
        );
        const matchesCountries = entity.EntitiesInCountries?.some(
          (c) =>
            c.Countries.countryname?.toLowerCase().includes(lower) ||
            c.Countries.countrycodePolpal?.toLowerCase().includes(lower)
        );
        return (
          String(entity.polpalId).toLowerCase().includes(lower) ||
          entity.nameShort.toLowerCase().includes(lower) ||
          entity.nameEnglish.toLowerCase().includes(lower) ||
          entity.name.toLowerCase().includes(lower) ||
          entity.entityType?.toLowerCase().includes(lower) ||
          matchesEntityNames ||
          matchesCountries
        );
      }
      return true;
    });
  }, [unassignedEntities, filterRegion, filterCountry, search]);

  const shareStats = useMemo(() => {
    const totalNonHidden = allEntities.filter((e) => !e.isHidden).length;
    const unassignedNonHidden = unassignedEntities?.filter((e) => !e.isHidden).length ?? 0;
    if (totalNonHidden === 0) return { unassignedNonHidden, totalNonHidden, percentage: 0 };
    return { unassignedNonHidden, totalNonHidden, percentage: (unassignedNonHidden / totalNonHidden) * 100 };
  }, [allEntities, unassignedEntities]);

  useEffect(() => { setCurrentPage(1); }, [filterRegion, filterCountry, search]);

  const totalPages = Math.max(1, Math.ceil(filteredEntities.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const pagedEntities = filteredEntities.slice(pageStart, pageEnd);

  if (loadingData) {
    return <LoadingSpinner title="Loading unassigned entities data..." message={<>Fetching unassigned entities</>} />;
  }

  if (errorData) {
    return <ErrorState message={<>We encountered an issue while loading all unassigned entities.</>} error={errorData} backHref="/" backLabel="Back to Homepage" />;
  }

  if ((!unassignedEntities && !loadingData) || (!isLoggedIn)) {
    return (
      <NotFoundState
        title="Unassigned Entities Not Found"
        message={<>No unassigned entities could be found or you don&apos;t have permission to view them.</>}
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
        { label: "Unassigned Entities" },
      ]} />

      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              Quality Check: Unassigned Entities
            </h1>
            <p className="text-gray-500 text-sm">
              All entities currently marked as <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">UNASSIGNED</span>.
            </p>
          </div>
          {shareStats.totalNonHidden > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-5 py-3 text-center min-w-[12rem]">
              <span className="text-xs font-medium text-red-600 uppercase tracking-wide block mb-1">Share of unassigned</span>
              <span className="text-2xl font-bold text-red-700">{shareStats.percentage.toFixed(1)}%</span>
              <span className="text-xs text-red-500 block">
                {shareStats.unassignedNonHidden} / {shareStats.totalNonHidden}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Entities Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center gap-3 flex-1">
            <div>
              <p className="text-sm text-gray-600">
                {filteredEntities.length === (unassignedEntities?.length ?? 0)
                  ? `All ${unassignedEntities?.length ?? 0} unassigned entit${(unassignedEntities?.length ?? 0) !== 1 ? "ies" : "y"}`
                  : `Showing ${filteredEntities.length} of ${unassignedEntities?.length ?? 0} unassigned entit${(unassignedEntities?.length ?? 0) !== 1 ? "ies" : "y"}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search entities..." />
            <select
              value={filterRegion}
              onChange={(e) => { setFilterRegion(e.target.value); setFilterCountry(""); }}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="">All regions</option>
              {availableRegions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
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
            {(filterRegion || filterCountry || search) && (
              <button
                type="button"
                onClick={() => { setFilterRegion(""); setFilterCountry(""); setSearch(""); }}
                className="text-xs text-gray-500 hover:text-red-600 underline underline-offset-2 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {filteredEntities.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <h3 className="text-sm font-medium text-gray-900">No unassigned entities found</h3>
            <p className="text-sm text-gray-500">No entities match your search criteria.</p>
            {(filterRegion || filterCountry || search) && (
              <button
                type="button"
                onClick={() => { setFilterRegion(""); setFilterCountry(""); setSearch(""); }}
                className="mt-2 text-xs text-primary hover:underline"
              >Clear filters</button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-0">
              {/* Column headers — must match AllEntitiesCard grid exactly */}
              <div className="grid grid-cols-[1rem_4rem_0.75rem_5rem] sm:grid-cols-[1rem_4rem_0.75rem_5rem_1fr_1fr_6rem_2rem_2rem_2rem] lg:grid-cols-[1rem_4rem_0.75rem_5rem_1fr_1fr_6rem_2rem_2rem_2rem] items-center gap-2 px-2 pb-1 border-t border-gray-200 mt-1 py-2 border-l border-r border-gray-200 bg-gray-50 font-medium text-gray-800 uppercase tracking-wide rounded-tl rounded-tr font-semibold border-l-4 border-r-4">
                <span />
                <span className="text-left text-xs font-semibold text-gray-800 uppercase tracking-wide">PolPaL ID</span>
                <span />
                <span className="text-left text-xs font-semibold text-gray-800 uppercase tracking-wide">Short Name</span>
                <span className="hidden sm:inline text-left text-xs font-semibold text-gray-800 uppercase tracking-wide px-5">English Name</span>
                <span className="hidden sm:inline text-left text-xs font-semibold text-gray-800 uppercase tracking-wide px-5">Name</span>
                <span className="hidden sm:inline text-left text-xs font-semibold text-gray-800 uppercase tracking-wide">Type</span>
                <span className="hidden sm:inline" />
                <span className="hidden sm:inline" />
              </div>

              {/* Entity rows */}
              {pagedEntities.map((entity) => (
                <div key={entity.polpalId} className="relative group">
                  <AllEntitiesCard entity={entity} />
                  {entity.comment && (
                    <span
                      className="absolute top-1.5 left-[calc(1rem+4rem+0.25rem)] z-10"
                      title={entity.comment}
                    >
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-600 text-[10px] font-bold cursor-help">
                        C
                      </span>
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Showing {pageStart + 1}–{Math.min(pageEnd, filteredEntities.length)} of{" "}
                  {filteredEntities.length} unassigned entit{filteredEntities.length !== 1 ? "ies" : "y"}
                </p>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={safePage === 1}
                    className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="First page"
                  >
                    «
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Previous page"
                  >
                    ‹
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - safePage) <= 2
                    )
                    .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === "…" ? (
                        <span key={`ellipsis-${i}`} className="px-2 py-1 text-xs text-gray-400">
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p as number)}
                          className={`px-2 py-1 text-xs rounded border ${safePage === p
                            ? "bg-primary text-white border-primary font-semibold"
                            : "border-gray-200 text-gray-600 hover:bg-gray-100"
                            }`}
                          aria-current={safePage === p ? "page" : undefined}
                        >
                          {p}
                        </button>
                      )
                    )}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Next page"
                  >
                    ›
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={safePage === totalPages}
                    className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Last page"
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
