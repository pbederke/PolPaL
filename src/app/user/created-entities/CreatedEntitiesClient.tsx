"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { EntityCard, EntityCardEntity } from "@/components/ui/EntityCard";

const PAGE_SIZE = 12;

export default function CreatedEntitiesClient() {
    const { auth, loadingAuth } = useAuth();
    const userId = auth.userId;

    const [entities, setEntities] = useState<EntityCardEntity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [filterCountry, setFilterCountry] = useState("");

    useEffect(() => {
        if (loadingAuth) return;
        const controller = new AbortController();
        const load = async () => {
            if (!auth.loggedIn || !userId) {
                setError("You do not have access to this page. Please log in.");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            fetch(`/api/users/${userId}/entities`, {
                credentials: "include",
                signal: controller.signal,
            })
                .then((r) => {
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                    return r.json();
                })
                .then(setEntities)
                .catch((err) => {
                    if (err instanceof Error && err.name !== "AbortError") setError(err instanceof Error ? err.message : String(err));
                })
                .finally(() => {
                    if (!controller.signal.aborted) setLoading(false);
                });
        };
        load();
        return () => controller.abort();
    }, [auth.loggedIn, userId, loadingAuth]);

    if (loadingAuth || loading) return <LoadingSpinner title="Loading entities..." message="Fetching your created entities." />;
    if (error) return <ErrorState message="Failed to load entities." error={error} backHref="/user" backLabel="Back to Profile" />;

    // Build country options from all entities
    const allCountries = Array.from(
        new Map(
            entities
                .flatMap((e) => e.EntitiesInCountries ?? [])
                .map((eic) => [eic.countrycodePolpal, { code: eic.countrycodePolpal, name: eic.Countries?.countryname ?? eic.countrycodePolpal }])
        ).values()
    ).sort((a, b) => a.name.localeCompare(b.name));

    const filteredEntities = filterCountry
        ? entities.filter((e) => e.EntitiesInCountries?.some((eic) => eic.countrycodePolpal === filterCountry))
        : entities;

    const totalPages = Math.max(1, Math.ceil(filteredEntities.length / PAGE_SIZE));
    const pageEntities = filteredEntities.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <Breadcrumbs items={[
                { label: "Home", href: "/" },
                { label: "Profile", href: "/user" },
                { label: "Created Entities" },
            ]} />

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between mb-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Created Entities</h1>
                        <p className="text-sm text-gray-500">
                            {filterCountry
                                ? `${filteredEntities.length} of ${entities.length} entities`
                                : `All entities you have created (${entities.length})`}
                        </p>
                    </div>

                    {allCountries.length > 0 && (
                        <div className="flex flex-col gap-1 w-full sm:w-56">
                            <div className="flex items-center justify-between">
                                <label className="text-xs text-gray-500 font-medium">Country</label>
                                {filterCountry && (
                                    <button
                                        onClick={() => { setFilterCountry(""); setPage(1); }}
                                        className="text-xs text-primary hover:underline"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                            <select
                                value={filterCountry}
                                onChange={(e) => { setFilterCountry(e.target.value); setPage(1); }}
                                className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/40"
                            >
                                <option value="">All countries</option>
                                {allCountries.map((c) => (
                                    <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                <hr className="border-t border-gray-100 my-4" />

                {filteredEntities.length === 0 ? (
                    <p className="text-sm text-gray-500">{entities.length === 0 ? "No entities created yet." : "No entities match the selected country."}</p>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pageEntities.map((entity) => (
                                <EntityCard key={entity.polpalId} entity={entity} showLogo isLoggedIn={auth.loggedIn} hideAppearance />
                            ))}
                        </div>
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                >
                                    Previous
                                </button>
                                <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
