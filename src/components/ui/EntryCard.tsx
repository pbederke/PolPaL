"use client";

import { Fragment } from "react";
import Link from "next/link";
import { ArrowUpRight, Calendar, Hash } from "lucide-react";
import { formatPartialDate } from "@/lib/shared/utils";
import CountryFlag from "@/components/ui/DisplayFlags";

// ── Single entry ─────────────────────────────────────────────────────────────

export interface EntryCardSingleData {
    type: "single";
    entryId: string;
    entryEntityIdVar: string;
    entryEntityId: string;
    entryEntityNameShort?: string | null;
    entryEntityNameEnglish?: string | null;
    entryEntityName?: string | null;
    year?: number | null;
    month?: number | null;
    day?: number | null;
    additionalInformation?: string | null;
    note?: string | null;
    hasMultipleLinked?: boolean;
    hasApproved?: boolean;
    hasRejected?: boolean;
    countrycodePolpal?: string | null;
    iso2c?: string | null;
    countryname?: string | null;
}

// ── Aggregated entry ──────────────────────────────────────────────────────────

export interface EntryCardAggregatedData {
    type: "aggregated";
    entryEntityIdVar: string;
    entryEntityId: string;
    namesShort?: string[] | null;
    namesEnglish?: string[] | null;
    names?: string[] | null;
    yearFirst?: number | null;
    monthFirst?: number | null;
    dayFirst?: number | null;
    yearLast?: number | null;
    monthLast?: number | null;
    dayLast?: number | null;
    observationCount: number;
    hasMultipleNames?: boolean;
    hasMultipleLinked?: boolean;
    hasUnlinked?: boolean;
    hasApproved?: boolean;
    hasRejected?: boolean;
    firstEntryId?: string | null;
    countrycodePolpal?: string | null;
    iso2c?: string | null;
    countryname?: string | null;
}

export type EntryCardData = EntryCardSingleData | EntryCardAggregatedData;

// ── Badge helper ──────────────────────────────────────────────────────────────

function Badge({ color, children }: { color: "blue" | "green" | "amber" | "red"; children: React.ReactNode }) {
    const styles = {
        blue: "text-blue-700 bg-blue-50 border-blue-300",
        green: "text-green-700 bg-green-50 border-green-300",
        amber: "text-amber-700 bg-amber-50 border-amber-300",
        red: "text-red-700 bg-red-50 border-red-300",
    };
    return (
        <span className={`inline-flex items-center gap-1 border rounded px-1.5 py-0.5 text-xs ${styles[color]}`}>
            {children}
        </span>
    );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EntryCard({ entry, showFlag = false }: { entry: EntryCardData; showFlag?: boolean }) {
    return (
        <div>
            <section className="relative border border-gray-200 border-l-4 border-l-amber-200 border-r-1 border-r-amber-200 rounded-lg p-4 bg-white shadow-sm space-y-2">

                {/* Top-right: link to detail page for single entries, or first entry for dateless aggregated entries */}
                {(entry.type === "single" || (entry.type === "aggregated" && entry.firstEntryId)) && (
                    <div className="absolute top-2 right-3 flex items-center">
                        <Link
                            href={`/data/entries/${entry.type === "single" ? entry.entryId : entry.firstEntryId}`}
                            title="View entry detail"
                            className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 transition-colors"
                        >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                )}

                {/* ── Status badges ─────────────────────────────────────────────── */}
                {(entry.hasMultipleLinked || entry.hasApproved || entry.hasRejected || (entry.type === "aggregated" && (entry.hasUnlinked))) && (
                    <div className="flex flex-wrap gap-1">
                        {entry.hasApproved && (
                            <Badge color="green">
                                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                Approved
                            </Badge>
                        )}
                        {entry.hasRejected && (
                            <Badge color="red">
                                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Rejected
                            </Badge>
                        )}
                        {entry.hasMultipleLinked && (
                            <Badge color="green">
                                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Multiple links
                            </Badge>
                        )}
                        {entry.type === "aggregated" && entry.hasUnlinked && (
                            <Badge color="red">
                                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                                Missing links
                            </Badge>
                        )}
                        {entry.type === "aggregated" && entry.hasMultipleNames && (
                            <Badge color="blue">
                                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                </svg>
                                Multiple names
                            </Badge>
                        )}
                    </div>
                )}

                {/* ── Names ─────────────────────────────────────────────────────── */}
                <div className="text-xs text-gray-700 pr-6 flex items-start gap-2">
                    {showFlag && entry.countryname && (
                        <div className="shrink-0 mt-0.5">
                            <CountryFlag
                                iso2c={entry.iso2c}
                                countrycodePolpal={entry.countrycodePolpal}
                                countryname={entry.countryname}
                                size={28}
                            />
                        </div>
                    )}
                    <div className="min-w-0">
                    {entry.type === "single" ? (
                        <div className="flex flex-col gap-0.5">
                            {entry.entryEntityNameShort && (
                                <span className="font-medium">{entry.entryEntityNameShort}</span>
                            )}
                            {entry.entryEntityNameEnglish && entry.entryEntityNameEnglish !== entry.entryEntityNameShort && (
                                <span className="text-gray-500">{entry.entryEntityNameEnglish}</span>
                            )}
                            {entry.entryEntityName
                                && entry.entryEntityName !== entry.entryEntityNameShort
                                && entry.entryEntityName !== entry.entryEntityNameEnglish && (
                                    <span className="text-gray-500">{entry.entryEntityName}</span>
                                )}
                            {!entry.entryEntityNameShort && !entry.entryEntityNameEnglish && !entry.entryEntityName && (
                                <span className="italic text-gray-400">Unknown</span>
                            )}
                        </div>
                    ) : (
                        <div className=" gap-1">
                            {(() => {
                                const maxLen = Math.max(
                                    entry.namesShort?.length ?? 0,
                                    entry.namesEnglish?.length ?? 0,
                                    entry.names?.length ?? 0,
                                );
                                if (maxLen === 0) return <span className="italic text-gray-400">Unknown</span>;
                                return Array.from({ length: maxLen }, (_, i) => (
                                    <div key={i} className={i > 0 ? "border-t border-gray-100 pt-1" : ""}>
                                        {entry.namesShort?.[i] && (
                                            <div className="font-medium">{entry.namesShort[i]}</div>
                                        )}
                                        {entry.namesEnglish?.[i] && entry.namesEnglish[i] !== entry.namesShort?.[i] && (
                                            <div className="text-gray-500">{entry.namesEnglish[i]}</div>
                                        )}
                                        {entry.names?.[i]
                                            && entry.names[i] !== entry.namesShort?.[i]
                                            && entry.names[i] !== entry.namesEnglish?.[i] && (
                                                <div className="text-gray-500">{entry.names[i]}</div>
                                            )}
                                    </div>
                                ));
                            })()}
                        </div>
                    )}
                    </div>
                </div>

                {/* ── Date ──────────────────────────────────────────────────────── */}
                <div className="text-xs text-gray-500 border-t pt-1.5">
                    <div className="flex items-center gap-1 font-medium text-gray-600 mb-0.5">
                        <Calendar className="w-3 h-3" />
                        Date
                    </div>
                    {entry.type === "single" ? (
                        <span>
                            {formatPartialDate(entry.year, entry.month, entry.day, "") || (
                                <span className="italic text-gray-400">no date</span>
                            )}
                        </span>
                    ) : (
                        <div className="flex flex-col gap-0.5">
                            <span>
                                First: {formatPartialDate(entry.yearFirst, entry.monthFirst, entry.dayFirst, "") || (
                                    <span className="italic text-gray-400">no date</span>
                                )}
                            </span>
                            <span>
                                Last: {formatPartialDate(entry.yearLast, entry.monthLast, entry.dayLast, "") || (
                                    <span className="italic text-gray-400">no date</span>
                                )}
                            </span>
                            <span className="text-gray-400">
                                {entry.observationCount} observation{entry.observationCount !== 1 ? "s" : ""}
                            </span>
                        </div>
                    )}
                </div>

                {/* ── Entity ID ─────────────────────────────────────────────────── */}
                <div className="text-xs text-gray-500 border-t pt-1.5">
                    <div className="flex items-center gap-1 font-medium text-gray-600 mb-0.5">
                        <Hash className="w-3 h-3" />
                        Entity ID
                    </div>
                    <div className="font-mono text-gray-700">
                        {entry.entryEntityId || <span className="italic text-gray-400">unknown</span>}
                    </div>
                    <div className="font-mono text-gray-400 italic">
                        ({entry.entryEntityIdVar || <span className="italic">unknown</span>})
                    </div>
                </div>

                {/* ── Note / additional info (single only) ──────────────────────── */}
                {entry.type === "single" && (entry.additionalInformation || entry.note) && (
                    <div className="text-xs text-gray-500 border-t pt-1.5 flex flex-col gap-0.5">
                        {entry.additionalInformation && (() => {
                            let parsed: Record<string, unknown> | null = null;
                            try { parsed = JSON.parse(entry.additionalInformation); } catch { /* not JSON */ }
                            return (
                                <div>
                                    <span className="font-medium text-gray-600">Additional info:</span>
                                    {parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (
                                        <dl className="mt-0.5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
                                            {Object.entries(parsed).map(([k, v]) => (
                                                <Fragment key={k}>
                                                    <dt className="font-medium text-gray-500 whitespace-nowrap">{k}:</dt>
                                                    <dd className="text-gray-700">{String(v ?? "")}</dd>
                                                </Fragment>
                                            ))}
                                        </dl>
                                    ) : (
                                        <span className="ml-1">{entry.additionalInformation}</span>
                                    )}
                                </div>
                            );
                        })()}
                        {entry.note && (
                            <div>
                                <span className="font-medium text-gray-600">Note: </span>
                                {entry.note}
                            </div>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}
