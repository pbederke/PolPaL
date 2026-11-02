"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, ArrowUpRight } from "lucide-react";


export interface EntityDatasetCardData {
    projectKey: string;
    projectNameShort: string;
    projectName: string;
    datasetKey: string;
    datasetNameShort: string;
    datasetName: string;
    firstAppearanceYear: number | null;
    lastAppearanceYear: number | null;
    versions: { versionKey: string; version: string; versionName: string | null; varTitles: Record<string, { title: string; content: string }> }[];
    entryEntityIdVars: { varName: string; values: string[] }[];
}

export interface EntityProjectCardData {
    projectKey: string;
    projectNameShort: string;
    projectName: string;
    datasets: Omit<EntityDatasetCardData, "projectKey" | "projectNameShort" | "projectName">[];
}

function DatasetRow({ projectKey, polpalId, dataset }: { projectKey: string; polpalId: number; dataset: Omit<EntityDatasetCardData, "projectKey" | "projectNameShort" | "projectName"> }) {
    const [open, setOpen] = useState(false);
    const [openVersions, setOpenVersions] = useState<Set<string>>(new Set());

    const toggleVersion = (vk: string) =>
        setOpenVersions((prev) => { const s = new Set(prev); if (s.has(vk)) { s.delete(vk); } else { s.add(vk); } return s; });

    const hasDetails = dataset.versions.length > 0 || dataset.entryEntityIdVars.length > 0;

    const yearRange = dataset.firstAppearanceYear
        ? `${dataset.firstAppearanceYear}${dataset.lastAppearanceYear && dataset.lastAppearanceYear !== dataset.firstAppearanceYear ? `–${dataset.lastAppearanceYear}` : ""}`
        : null;

    return (
        <>
            <tr className="bg-blue-50 cursor-pointer" onClick={() => setOpen((v) => !v)}>
                <td className="px-2 py-2 border-l-4 border-blue-400">
                    <div className="flex items-center justify-start gap-1">
                        <span className="text-[9px] font-bold text-blue-600 bg-blue-100 rounded px-1 py-0.5 leading-none">DS</span>
                        {hasDetails && (
                            open
                                ? <ChevronDown className="w-3 h-3 text-gray-400" />
                                : <ChevronRight className="w-3 h-3 text-gray-400" />
                        )}
                    </div>
                </td>
                <td className="px-4 py-2 text-gray-700">
                    <Link
                        href={`/data/projects/${projectKey}/${dataset.datasetKey}`}
                        className="text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {dataset.datasetNameShort || <span className="italic text-gray-400">(missing)</span>}
                    </Link>
                </td>
                <td className="hidden sm:table-cell px-4 py-2 text-gray-700">
                    <Link
                        href={`/data/projects/${projectKey}/${dataset.datasetKey}`}
                        className="text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {dataset.datasetName}
                    </Link>
                </td>
                <td className="px-4 py-2 text-gray-500 text-center">
                    {yearRange ?? <span className="italic text-gray-400">—</span>}
                </td>
                <td className="hidden sm:table-cell px-4 py-2 text-gray-500 text-left">
                    {dataset.versions.length} version{dataset.versions.length !== 1 ? "s" : ""}
                </td>
            </tr>
            {open && dataset.versions.map((v) => (
                <Fragment key={v.versionKey}>
                    <tr className={`cursor-pointer ${openVersions.has(v.versionKey) ? "bg-green-100" : "bg-green-50 hover:bg-green-100"}`} onClick={() => dataset.entryEntityIdVars.length > 0 && toggleVersion(v.versionKey)}>
                        <td className="px-2 py-2 border-l-4 border-green-500">
                            <div className="flex items-center justify-start gap-1">
                                <span className="text-[9px] font-bold text-green-600 bg-green-100 rounded px-1 py-0.5 leading-none">V</span>
                                {dataset.entryEntityIdVars.length > 0 && (
                                    openVersions.has(v.versionKey)
                                        ? <ChevronDown className="w-3 h-3 text-gray-400" />
                                        : <ChevronRight className="w-3 h-3 text-gray-400" />
                                )}
                            </div>
                        </td>
                        <td className="px-4 py-2 text-gray-600 text-left" colSpan={1}>
                            <Link
                                href={`/data/projects/${projectKey}/${dataset.datasetKey}/${v.versionKey}`}
                                className="text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {v.version || <span className="italic text-gray-400">(missing)</span>}
                            </Link>
                        </td>
                        <td className="hidden sm:table-cell px-4 py-2 text-gray-600 text-left" colSpan={1}>
                            <Link
                                href={`/data/projects/${projectKey}/${dataset.datasetKey}/${v.versionKey}`}
                                className="text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {v.versionName || v.version}
                            </Link>
                        </td>
                        <td className="px-4 py-2 text-center">
                            <Link
                                href={`/data/entities/${polpalId}/${v.versionKey}`}
                                title="View entries for this entity in this version"
                                className="inline-flex items-center gap-0.5 text-xs text-amber-600 hover:text-amber-800 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            >
                                Entries <ArrowUpRight className="w-3 h-3" />
                            </Link>
                        </td>
                        <td className="hidden sm:table-cell px-4 py-2 text-gray-500 text-left">
                            {dataset.entryEntityIdVars.length} variable{dataset.entryEntityIdVars.length !== 1 ? "s" : ""}
                        </td>
                    </tr>
                    {openVersions.has(v.versionKey) && dataset.entryEntityIdVars.length > 0 && (
                        <tr className="bg-gray-50">
                            <td className="px-2 py-2 border-l-4 border-gray-300 align-top">
                                <div className="flex items-start justify-start">
                                    <span className="text-[9px] font-bold text-gray-500 bg-gray-200 rounded px-1 py-0.5 leading-none">ID</span>
                                </div>
                            </td>
                            <td colSpan={4} className="px-4 py-2.5">
                                <div className="rounded border border-gray-200 overflow-hidden text-[10px] grid grid-cols-[auto_auto_1fr]">
                                    {dataset.entryEntityIdVars.flatMap(({ varName, values }, i) => [
                                        <div key={`${varName}-name`} className={`px-2.5 py-1.5 bg-gray-200 border-r border-gray-300 font-mono font-semibold text-gray-600 whitespace-nowrap flex items-center${i > 0 ? " border-t border-gray-200" : ""}`}>
                                            {varName}
                                        </div>,
                                        <div key={`${varName}-title`} className={`px-2.5 py-1.5 bg-gray-100 border-r border-gray-300 text-gray-600 whitespace-nowrap flex items-center${i > 0 ? " border-t border-gray-200" : ""}`}
                                            title={v.varTitles[varName]?.content}>
                                            {v.varTitles[varName]?.title ?? <span className="italic text-gray-400">(no title)</span>}
                                        </div>,
                                        <div key={`${varName}-values`} className={`flex flex-wrap gap-1 items-center px-2.5 py-1.5${i > 0 ? " border-t border-gray-200" : ""}`}>
                                            {values.map((val) => (
                                                <span key={val} className="inline-block rounded-sm bg-white border border-gray-300 px-1.5 py-0.5 font-mono text-gray-800">{val}</span>
                                            ))}
                                        </div>,
                                    ])}
                                </div>
                            </td>
                        </tr>
                    )}
                </Fragment>
            ))}
        </>
    );
}

export function EntityDatasetCard({ project, polpalId }: { project: EntityProjectCardData; polpalId: number }) {
    const [open, setOpen] = useState(false);

    const firstYears = project.datasets.map((d) => d.firstAppearanceYear).filter((y): y is number => y !== null);
    const lastYears = project.datasets.map((d) => d.lastAppearanceYear ?? d.firstAppearanceYear).filter((y): y is number => y !== null);
    const projectFirstYear = firstYears.length > 0 ? Math.min(...firstYears) : null;
    const projectLastYear = lastYears.length > 0 ? Math.max(...lastYears) : null;
    const projectYearRange = projectFirstYear
        ? `${projectFirstYear}${projectLastYear && projectLastYear !== projectFirstYear ? `–${projectLastYear}` : ""}`
        : null;

    return (
        <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full table-fixed divide-y divide-gray-200 text-[11px] leading-tight">
                <tbody className="bg-white divide-y divide-gray-100">
                    <tr
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setOpen((v) => !v)}
                    >
                        <td className="px-2 py-2 border-l-4 border-purple-300 w-8">
                            <div className="flex items-center justify-start gap-1">
                                <span className="text-[9px] font-bold text-purple-600 bg-purple-50 rounded px-1 py-0.5 leading-none">P</span>
                                {project.datasets.length > 0 && (
                                    open
                                        ? <ChevronDown className="w-3 h-3 text-gray-400" />
                                        : <ChevronRight className="w-3 h-3 text-gray-400" />
                                )}
                            </div>
                        </td>
                        <td className="px-4 py-2 text-gray-800 w-28">
                            <Link
                                href={`/data/projects/${project.projectKey}`}
                                className="text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {project.projectNameShort}
                            </Link>
                        </td>
                        <td className="hidden sm:table-cell px-4 py-2 text-gray-800">
                            <Link
                                href={`/data/projects/${project.projectKey}`}
                                className="text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {project.projectName}
                            </Link>
                        </td>
                        <td className="px-4 py-2 text-gray-500 text-center w-24">
                            {projectYearRange ?? <span className="italic text-gray-400">—</span>}
                        </td>
                        <td className="hidden sm:table-cell px-4 py-2 text-gray-500 text-left w-24">
                            {project.datasets.length} dataset{project.datasets.length !== 1 ? "s" : ""}
                        </td>
                    </tr>
                    {open && project.datasets.map((ds) => (
                        <DatasetRow key={ds.datasetKey} projectKey={project.projectKey} polpalId={polpalId} dataset={ds} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
