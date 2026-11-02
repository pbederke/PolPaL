"use client";

import Link from "next/link";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { useEffect, useState, useMemo } from "react";
import SearchInput from "@/components/ui/SearchInput";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import NotFoundState from "@/components/ui/NotFoundState";


interface VersionsWithProgress {
    projectKey: string;
    projectNameShort: string;
    projectName: string;
    datasetKey: string;
    datasetNameShort: string;
    datasetName: string;
    versionIsHidden: boolean;
    versionKey: string;
    version: string;
    versionName: string | null;
    totalEntries: number;
    linkingProgress: number | null;
    validationProgress: number | null;
};


export default function LinkingOverviewClient() {

    // State for versions data
    const [versions, setVersions] = useState<VersionsWithProgress[] | null>(null);

    // State for loading and error handling
    const { auth } = useAuth();
    const isLoggedIn = !!auth?.userId;

    // State for loading and error handling 
    const [loadingData, setLoadingData] = useState(true);
    const [errorData, setErrorData] = useState<string | null>(null);

    // State for dataset search
    const [searchVersions, setSearchVersions] = useState("");
    const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);

    // Fetch dataset info on component mount and when datasetKey changes
    useEffect(() => {
        const abortController = new AbortController();
        const { signal } = abortController;

        const fetchData = async () => {

            setLoadingData(true);
            setErrorData(null);

            try {
                // Fetch dataset info
                const versionsRes = await fetch(
                    `/api/versions/linking-overview`,
                    {
                        credentials: "include",
                        signal,
                    }
                );
                if (versionsRes.status === 401) return;
                if (!versionsRes.ok) throw new Error(await versionsRes.text());
                const versionsData: VersionsWithProgress[] = await versionsRes.json();

                if (!versionsData) {
                    throw new Error("Version not found or you don't have permission to view it.");
                }

                setVersions(versionsData);

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

    // Filter + sort versions
    const filteredVersions = useMemo(() => {
        const lowerSearch = searchVersions.toLowerCase().trim();
        return (versions ?? [])
            .filter((v) => {
                if (showIncompleteOnly && v.linkingProgress !== null && Number(v.linkingProgress) >= 100) return false;
                if (!lowerSearch) return true;
                const projectNameShort = v.projectNameShort.toLowerCase();
                const projectName = v.projectName.toLowerCase();
                const datasetNameShort = v.datasetNameShort.toLowerCase();
                const datasetName = v.datasetName.toLowerCase();
                const versionName = v.versionName?.toLowerCase() || "";
                const version = v.version?.toLowerCase() || "";
                return (
                    projectNameShort.includes(lowerSearch) ||
                    projectName.includes(lowerSearch) ||
                    datasetNameShort.includes(lowerSearch) ||
                    datasetName.includes(lowerSearch) ||
                    versionName.includes(lowerSearch) ||
                    version.includes(lowerSearch)
                );
            })
    }, [versions, searchVersions, showIncompleteOnly]);

    // Render loading state
    if (loadingData) {
        return <LoadingSpinner title="Loading version data..." message={<>Fetching versions</>} />;
    }

    // Render error state
    if (errorData) {
        return <ErrorState message={<>We encountered an issue while loading all versions.</>} error={errorData} backHref="/" backLabel="Back to Homepage" />;
    }

    if ((!versions && !loadingData) || (!isLoggedIn)) {
        return (
            <NotFoundState
                title="Versions Not Found"
                message={<>No versions could be found or you don&apos;t have permission to view them.</>}
                backHref="/"
                backLabel="Back to Homepage"
            />
        );
    }

    const totalVersions = versions?.length ?? 0;
    const completeCount = (versions ?? []).filter(v => v.linkingProgress !== null && Number(v.linkingProgress) >= 100).length;
    const inProgressCount = (versions ?? []).filter(v => v.linkingProgress !== null && Number(v.linkingProgress) > 0 && Number(v.linkingProgress) < 100).length;
    const notStartedCount = (versions ?? []).filter(v => v.linkingProgress === null || Number(v.linkingProgress) === 0).length;

    const overallLinkingPct = totalVersions > 0
        ? (versions ?? []).reduce((sum, v) => sum + (Number(v.linkingProgress) || 0), 0) / totalVersions
        : 0;
    const linkingBarColor = overallLinkingPct < 30 ? "bg-red-50 border-red-100 text-red-700" : overallLinkingPct < 70 ? "bg-yellow-50 border-yellow-100 text-yellow-700" : "bg-green-50 border-green-100 text-green-700";

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Breadcrumbs */}
            <Breadcrumbs items={[
                { label: "Home", href: "/" },
                { label: "Linking" },
            ]} />

            {/* Page Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Linking Overview</h1>
                <p className="mt-2 text-sm text-gray-700">
                    Track and manage entity linking progress across all dataset versions.
                </p>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                    { label: "Total Versions", value: totalVersions, color: "bg-blue-50 border-blue-100 text-blue-700" },
                    { label: "Complete", value: completeCount, color: "bg-green-50 border-green-100 text-green-700" },
                    { label: "In Progress", value: inProgressCount, color: "bg-yellow-50 border-yellow-100 text-yellow-700" },
                    { label: "Not Started", value: notStartedCount, color: "bg-gray-50 border-gray-100 text-gray-500" },
                    { label: "Linked", value: `${overallLinkingPct.toFixed(1)}%`, color: linkingBarColor },
                ].map(({ label, value, color }) => (
                    <div key={label} className={`rounded-xl border px-5 py-4 ${color}`}>
                        <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
                        <p className="text-3xl font-bold mt-1">{value}</p>
                    </div>
                ))}
            </div>

            {/* Versions Table */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                {/* Controls */}
                <div className="flex flex-wrap items-center gap-3 mb-5">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold text-gray-800">Dataset Versions</h2>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {filteredVersions.length === totalVersions
                                ? `All ${totalVersions} version${totalVersions !== 1 ? 's' : ''}`
                                : `Showing ${filteredVersions.length} of ${totalVersions} version${totalVersions !== 1 ? 's' : ''}`}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowIncompleteOnly((v) => !v)}
                        className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${showIncompleteOnly
                            ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                            : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                            }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${showIncompleteOnly ? "bg-yellow-500" : "bg-gray-300"}`} />
                        Incomplete only
                    </button>
                    <SearchInput value={searchVersions} onChange={setSearchVersions} placeholder="Search versions..." />
                </div>

                {filteredVersions.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <svg className="mx-auto h-10 w-10 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm font-medium text-gray-500">No versions match your filters</p>
                    </div>
                ) : (
                    <div className="overflow-auto rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
                                    <th scope="col" className="px-4 py-3 font-semibold">Project</th>
                                    <th scope="col" className="px-4 py-3 font-semibold">Dataset</th>
                                    <th scope="col" className="px-4 py-3 font-semibold">Version</th>
                                    <th scope="col" className="hidden md:table-cell px-4 py-3 font-semibold">Status</th>
                                    <th scope="col" className="px-4 py-3 font-semibold w-40">Linking</th>
                                    <th scope="col" className="hidden lg:table-cell px-4 py-3 font-semibold w-40">Validation</th>
                                    <th scope="col" className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {filteredVersions.map((v) => {
                                    const linkP = v.linkingProgress !== null ? Number(v.linkingProgress) : null;
                                    const valP = v.validationProgress !== null ? Number(v.validationProgress) : null;
                                    const progressBar = (p: number) => {
                                        const barColor = p < 30 ? "bg-red-400" : p < 70 ? "bg-yellow-400" : "bg-green-500";
                                        const textColor = p < 30 ? "text-red-700" : p < 70 ? "text-yellow-700" : "text-green-700";
                                        return (
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(p, 100)}%` }} />
                                                </div>
                                                <span className={`tabular-nums font-semibold w-10 text-right ${textColor}`}>{p.toFixed(1)}%</span>
                                            </div>
                                        );
                                    };
                                    return (
                                        <tr key={v.versionKey} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <Link href={`/data/projects/${v.projectKey}`} className="font-semibold text-primary hover:underline">
                                                    {v.projectNameShort}
                                                </Link>
                                                <p className="hidden md:block text-[10px] text-gray-400 truncate max-w-[12rem]">{v.projectName}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Link href={`/data/projects/${v.projectKey}/${v.datasetKey}`} className="font-semibold text-primary hover:underline">
                                                    {v.datasetNameShort}
                                                </Link>
                                                <p className="hidden md:block text-[10px] text-gray-400 truncate max-w-[14rem]">{v.datasetName}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Link href={`/data/projects/${v.projectKey}/${v.datasetKey}/${v.versionKey}`} className="font-medium text-gray-800 hover:underline hover:text-primary">
                                                    {v.version || <em className="text-gray-400">unnamed</em>}
                                                </Link>
                                                {v.versionName && (
                                                    <p className="hidden md:block text-[10px] text-gray-400 truncate max-w-[12rem]">{v.versionName}</p>
                                                )}
                                                <p className="text-[10px] text-gray-400 tabular-nums">{v.totalEntries.toLocaleString()} entries</p>
                                            </td>
                                            <td className="hidden md:table-cell px-4 py-3">
                                                {v.versionIsHidden ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-600 border border-red-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />Hidden
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Public
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {linkP !== null ? progressBar(linkP) : <span className="text-gray-300 italic">n/a</span>}
                                            </td>
                                            <td className="hidden lg:table-cell px-4 py-3">
                                                {valP !== null ? progressBar(valP) : <span className="text-gray-300 italic">n/a</span>}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Link
                                                    href={`/data/linking/${v.versionKey}`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm"
                                                >
                                                    Open Linking
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
