"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import NotFoundState from "@/components/ui/NotFoundState";
import { EntryCard, EntryCardSingleData } from "@/components/ui/EntryCard";
import { EntityCard, EntityCardEntity } from "@/components/ui/EntityCard";
import CountryBreadcrumbLinks from "@/components/ui/CountryBreadcrumbLinks";
import { Group, Rows3 } from "lucide-react";
import { VariableDocumentation, type Variable } from "@/components/ui/VariableDocumentation";

interface EntityInVersionData {
    entityPolpalId: number;
    entityNameShort: string;
    entityNameEnglish: string;
    entityIsHidden: boolean;
    entityCountries: { countrycodePolpal: string; countryname?: string }[];
    versionKey: string;
    version: string;
    versionName: string | null;
    projectKey: string;
    projectNameShort: string;
    projectName: string;
    datasetKey: string;
    datasetNameShort: string;
    datasetName: string;
    entity: EntityCardEntity;
    entries: {
        entryId: string;
        entryEntityIdVar: string;
        entryEntityId: string;
        entryEntityNameShort: string | null;
        entryEntityNameEnglish: string | null;
        entryEntityName: string | null;
        entryYear: number | null;
        entryMonth: number | null;
        entryDay: number | null;
        additionalInformation: string | null;
        note: string | null;
        hasMultipleLinked: boolean;
        hasApproved: boolean;
        hasRejected: boolean;
        countrycodePolpal: string | null;
        iso2c: string | null;
        countryname: string | null;
    }[];
}

export default function EntityInVersionClient() {
    const params = useParams();
    const polpalId = params.PolPaLId as string;
    const versionKey = params.versionKey as string;

    const { auth } = useAuth();

    const [data, setData] = useState<EntityInVersionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [varFilter, setVarFilter] = useState<string>("__all__");
    const [variables, setVariables] = useState<Variable[]>([]);

    useEffect(() => {
        const controller = new AbortController();
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const [res, varsRes] = await Promise.all([
                    fetch(`/api/entities/${polpalId}/versions/${versionKey}`, { credentials: "include", signal: controller.signal }),
                    fetch(`/api/variables/${encodeURIComponent(versionKey)}`, { signal: controller.signal }),
                ]);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const entityData: EntityInVersionData = await res.json();
                setData(entityData);
                if (varsRes.ok) {
                    const { variables: allVars }: { variables: Variable[] } = await varsRes.json();
                    const presentVars = new Set(entityData.entries.map(e => e.entryEntityIdVar));
                    setVariables(allVars.filter(v => presentVars.has(v.entryEntityIdVar)));
                }
            } catch (err) {
                if (err instanceof Error && err.name !== "AbortError") setError(err instanceof Error ? err.message : String(err));
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };
        load();
        return () => controller.abort();
    }, [polpalId, versionKey]);

    if (loading) return <LoadingSpinner title="Loading entries..." message="Fetching entries for this entity and version." />;
    if (error) return <ErrorState message="Failed to load entries." error={error} backHref={`/data/entities/${polpalId}`} />;
    if (!data) return <NotFoundState title="Not Found" message="No data found for this entity and version." showRetry />;

    const entries: EntryCardSingleData[] = data.entries.map((e) => ({
        type: "single",
        entryId: e.entryId,
        entryEntityIdVar: e.entryEntityIdVar,
        entryEntityId: e.entryEntityId,
        entryEntityNameShort: e.entryEntityNameShort,
        entryEntityNameEnglish: e.entryEntityNameEnglish,
        entryEntityName: e.entryEntityName,
        year: e.entryYear,
        month: e.entryMonth,
        day: e.entryDay,
        additionalInformation: e.additionalInformation,
        note: e.note,
        hasMultipleLinked: e.hasMultipleLinked,
        hasApproved: e.hasApproved,
        hasRejected: e.hasRejected,
        countrycodePolpal: e.countrycodePolpal,
        iso2c: e.iso2c,
        countryname: e.countryname,
    }));

    const uniqueVars = Array.from(new Set(entries.map((e) => e.entryEntityIdVar))).sort();
    const filteredEntries = varFilter === "__all__" ? entries : entries.filter((e) => e.entryEntityIdVar === varFilter);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Breadcrumbs */}
            <Breadcrumbs items={[
                { label: "Home", href: "/" },
                { label: "Countries", href: "/data/countries" },
                { label: <CountryBreadcrumbLinks countries={data.entityCountries} /> },
                { label: `${data.entityNameEnglish} (${data.entityNameShort})`, href: `/data/entities/${data.entityPolpalId}` },
                { label: `${data.projectNameShort} - ${data.datasetNameShort}${data.versionName ? ` – ${data.versionName}` : ""} (${data.version})` },
            ]} />

            <div className={`bg-white rounded-lg shadow-sm border p-6 ${data.entityIsHidden ? "border-red-700 border-l-6 border-r-6" : "border-gray-200"}`}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-primary/10 rounded-lg p-3">
                        <Group className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {data.entityNameShort} – {data.entityNameEnglish}
                        </h1>
                        <p className="text-sm text-gray-500">
                            {data.projectNameShort} - {data.datasetNameShort}
                            {data.versionName ? ` – ${data.versionName}` : ""}{" "}
                            (<span className="font-mono">{data.version}</span>)
                        </p>
                    </div>
                </div>
                <hr className="border-t border-gray-100 my-4" />
                {/* Version overview */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                        <span className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Project</span>
                        <a href={`/data/projects/${data.projectKey}`} className="text-sm font-medium text-primary hover:underline">
                            {data.projectName || data.projectNameShort}
                        </a>
                        {data.projectName && data.projectNameShort && (
                            <span className="block text-xs text-gray-400 mt-0.5">{data.projectNameShort}</span>
                        )}
                    </div>
                    <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                        <span className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Dataset</span>
                        <a href={`/data/projects/${data.projectKey}/${data.datasetKey}`} className="text-sm font-medium text-primary hover:underline">
                            {data.datasetName || data.datasetNameShort}
                        </a>
                        {data.datasetName && data.datasetNameShort && (
                            <span className="block text-xs text-gray-400 mt-0.5">{data.datasetNameShort}</span>
                        )}
                    </div>
                    <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                        <span className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Version</span>
                        <a href={`/data/projects/${data.projectKey}/${data.datasetKey}/${data.versionKey}`} className="text-sm font-medium text-primary hover:underline">
                            {data.versionName || data.version}
                        </a>
                        {data.versionName && (
                            <span className="block text-xs font-mono text-gray-400 mt-0.5">{data.version}</span>
                        )}
                    </div>
                </div>


                <p className="text-sm text-gray-600 mt-4 font-mono border border-gray-200 bg-gray-50 px-3 py-2 border-l-4 border-gray-300">
                    {entries.length} entr{entries.length !== 1 ? "ies" : "y"} of version{" "}
                    <span className="font-mono text-gray-800">{data.versionKey}</span> linked to this entity (<span className="font-mono text-gray-800">PolPaL ID: {data.entityPolpalId}</span>)
                </p>
                <hr className="border-t border-gray-100 my-4" />
                <EntityCard entity={data.entity} hideLinkButton showLogo />
            </div>

            <VariableDocumentation
                variables={variables}
                isLoggedIn={!!auth?.userId}
                addHref={["ADMIN", "DATAMANAGER"].includes(auth?.role ?? "") ? `/manage/variables/create/${versionKey}` : undefined}
            />

            <div className={`bg-white rounded-lg shadow-sm border p-6 ${data.entityIsHidden ? "border-red-700 border-l-6 border-r-6" : "border-gray-200"}`}>
                <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="bg-amber-100 rounded-lg p-3 shrink-0">
                            <Rows3 className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                Entries
                            </h2>
                            <p className="text-sm text-gray-500">
                                Details about the entries linked to this PolPaL entity.
                            </p>
                        </div>
                    </div>
                    {uniqueVars.length > 1 && (
                        <div className="flex items-center gap-2">
                            <label htmlFor="var-filter" className="text-sm text-gray-600 shrink-0">
                                
                            </label>
                            <select
                                id="var-filter"
                                value={varFilter}
                                onChange={(e) => setVarFilter(e.target.value)}
                                className="text-sm border border-gray-200 rounded px-2 py-1 bg-white font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/40"
                            >
                                <option value="__all__">All ({entries.length})</option>
                                {uniqueVars.map((v) => (
                                    <option key={v} value={v}>
                                        {v} ({entries.filter((e) => e.entryEntityIdVar === v).length})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                <hr className="border-t border-gray-100 my-4" />
                {/* Entries grid */}
                {filteredEntries.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {filteredEntries.map((entry) => (
                            <EntryCard key={entry.entryId} entry={entry} showFlag />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500 italic text-sm">
                        No entries found for this entity and version.
                    </div>
                )}
            </div>
        </div>
    );
}
