"use client";

import { useEffect, useState, useMemo } from "react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import SearchInput from "@/components/ui/SearchInput";
import { EntityTypesEnum } from "@/lib/shared/enums";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { AllEntitiesCard } from "@/components/ui/AllEntitesCard";

interface EntitiesInCountries {
    polpalId: number;
    nameEnglish: string;
    nameShort: string;
    name: string;
    entityType: EntityTypesEnum;
    wikipediaUrl: string;
    wikidataId: string;
    color: string | null;
    EntityNames: {
        nameShort: string;
        name: string;
        language: string;
        startYear: number | null;
        startMonth: number | null;
        startDay: number | null;
        endYear: number | null;
        endMonth: number | null;
        endDay: number | null;
    }[];
    EntitiesInCountries: {
        Countries: {
            countrycodePolpal: string;
            countryname: string;
            iso2c: string | null;
            region: string | null;
        };
    }[];
}

type SortKey = "polpalId" | "nameShort" | "nameEnglish" | "entityType";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 100;

export default function EntitiesClient() {
    const [entitiesData, setEntitiesData] = useState<EntitiesInCountries[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [errorData, setErrorData] = useState<string | null>(null);

    const [entitySearch, setEntitySearch] = useState("");
    const [sortKey] = useState<SortKey>("nameShort");
    const [sortDirection] = useState<SortDirection>("asc");

    // Pagination state — reset to page 1 whenever the search changes
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        setCurrentPage(1);
    }, [entitySearch]);

    useEffect(() => {
        const abortController = new AbortController();
        const { signal } = abortController;

        async function fetchAllData() {
            setLoadingData(true);
            setErrorData(null);

            try {
                const [entitiesRes] = await Promise.all([
                    fetch(`/api/entities`, { credentials: "include", signal }),
                ]);

                if (!entitiesRes.ok) throw new Error("Failed to load entities info");

                const data = await entitiesRes.json();
                setEntitiesData(data);
            } catch (err: unknown) {
                if (err instanceof Error && err.name !== "AbortError") {
                    console.error("Error fetching data:", err);
                    setErrorData(err instanceof Error ? err.message : String(err));
                }
            } finally {
                if (!abortController.signal.aborted) {
                    setLoadingData(false);
                }
            }
        }

        fetchAllData();
        return () => abortController.abort();
    }, []);

    function getSortValue(item: EntitiesInCountries, key: SortKey) {
        switch (key) {
            case "polpalId": return item.polpalId;
            case "nameShort": return item.nameShort;
            case "nameEnglish": return item.nameEnglish;
            case "entityType": return item.entityType;
            default: return "";
        }
    }

    // Full filtered + sorted list
    const filteredEntities = useMemo(() => {
        return entitiesData
            .filter((p) => {
                const lower = entitySearch.toLowerCase();
                const matchesEntityNames = p.EntityNames?.some(
                    (n) =>
                        n.nameShort?.toLowerCase().includes(lower) ||
                        n.name?.toLowerCase().includes(lower)
                );
                const matchesCountries = p.EntitiesInCountries?.some(
                    (c) =>
                        c.Countries.countryname?.toLowerCase().includes(lower) ||
                        c.Countries.countrycodePolpal?.toLowerCase().includes(lower)
                );
                return (
                    p.polpalId.toString().includes(lower) ||
                    p.nameShort?.toLowerCase().includes(lower) ||
                    p.nameEnglish?.toLowerCase().includes(lower) ||
                    p.name?.toLowerCase().includes(lower) ||
                    p.entityType?.toLowerCase().includes(lower) ||
                    matchesEntityNames ||
                    matchesCountries
                );
            })
            .sort((a, b) => {
                const valA = getSortValue(a, sortKey);
                const valB = getSortValue(b, sortKey);
                if (typeof valA === "number" && typeof valB === "number") {
                    return sortDirection === "asc" ? valA - valB : valB - valA;
                }
                return sortDirection === "asc"
                    ? String(valA).localeCompare(String(valB))
                    : String(valB).localeCompare(String(valA));
            });
    }, [entitiesData, entitySearch, sortKey, sortDirection]);

    // Derived pagination values
    const totalPages = Math.max(1, Math.ceil(filteredEntities.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const pageStart = (safePage - 1) * PAGE_SIZE;
    const pageEnd = pageStart + PAGE_SIZE;
    const pagedEntities = filteredEntities.slice(pageStart, pageEnd);

    if (loadingData) {
        return (
            <LoadingSpinner
                title="Loading entities..."
                message={<>Fetching all PolPaL entities. Please wait a moment.</>}
            />
        );
    }

    if (errorData || !entitiesData) {
        return (
            <ErrorState
                message={<>We encountered an issue while loading entities.</>}
                error={errorData}
                backHref="/"
                backLabel="Back to Homepage"
            />
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Breadcrumbs */}
            <Breadcrumbs items={[
                { label: "Home", href: "/" },
                { label: "Countries", href: "/data/countries" },
                { label: "PolPaL Entities (worldwide)" }
            ]} />

            {/* Page Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                            PolPaL Entities (worldwide)
                        </h1>
                    </div>
                </div>
            </div>

            {/* Entities Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:flex-wrap sm:items-center">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="bg-green-100 rounded-lg p-3">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6 text-green-600"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">PolPaL Entities</h2>
                            <p className="text-sm text-gray-600">
                                {filteredEntities.length === entitiesData.length
                                    ? `All ${entitiesData.length} entit${entitiesData.length !== 1 ? "ies" : "y"}`
                                    : `Showing ${filteredEntities.length} of ${entitiesData.length} entit${entitiesData.length !== 1 ? "ies" : "y"}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <SearchInput value={entitySearch} onChange={setEntitySearch} placeholder="Search entities..." />
                    </div>
                </div>

                {filteredEntities.length === 0 ? (
                    <div className="py-12 text-center text-gray-500">
                        <h3 className="text-sm font-medium text-gray-900">No entities found</h3>
                        <p className="text-sm text-gray-500">No entities match your search criteria.</p>
                    </div>
                ) : (
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

                        {/* Entity rows for current page */}
                        {pagedEntities.map((entity) => (
                            <AllEntitiesCard key={entity.polpalId} entity={entity} />
                        ))}
                    </div>
                )}

                {/* Pagination controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                            Showing {pageStart + 1}–{Math.min(pageEnd, filteredEntities.length)} of{" "}
                            {filteredEntities.length} entit{filteredEntities.length !== 1 ? "ies" : "y"}
                        </p>

                        <div className="flex items-center gap-1">
                            {/* First */}
                            <button
                                onClick={() => setCurrentPage(1)}
                                disabled={safePage === 1}
                                className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                aria-label="First page"
                            >
                                «
                            </button>

                            {/* Previous */}
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={safePage === 1}
                                className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                aria-label="Previous page"
                            >
                                ‹
                            </button>

                            {/* Page number pills — show up to 7 around current */}
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

                            {/* Next */}
                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={safePage === totalPages}
                                className="px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                aria-label="Next page"
                            >
                                ›
                            </button>

                            {/* Last */}
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
            </div>
        </div>
    );
}
