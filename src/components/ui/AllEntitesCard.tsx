"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { EntityTypeBadge } from "@/components/ui/EntityTypeBadge";
import { ButtonWikipedia, ButtonWikidata } from "@/components/ui/Buttons";
import { LANGUAGE_NAME_MAP } from "@/lib/shared/mapping";
import { formatPartialDate } from "@/lib/shared/utils";
import CountryFlag from "@/components/ui/DisplayFlags";

export interface AllEntitiesCardData {
    polpalId: number;
    nameShort: string;
    nameEnglish: string;
    name: string;
    entityType: string;
    wikipediaUrl: string | null;
    wikidataId: string | null;
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
    color?: string | null;
    EntitiesInCountries: {
        Countries: {
            countrycodePolpal: string;
            countryname: string;
            iso2c: string | null;
            region: string | null;
        };
    }[];
}

function getBorderColor(entityType: string): string {
    switch (entityType?.toUpperCase()) {
        case "PARTY": return "border-l-blue-400 border-r-blue-400";
        case "GROUPING": return "border-l-green-400 border-r-green-400";
        case "OTHERS": return "border-l-orange-400 border-r-orange-400";
        case "RESIDUAL": return "border-l-purple-400 border-r-purple-400";
        case "UNASSIGNED": return "border-l-red-400 border-r-red-400";
        case "INDEPENDENT": return "border-l-white-100 border-r-gray-400";
        case "UNKNOWN":
        default: return "border-l-gray-300 border-r-gray-300";
    }
}

export function AllEntitiesCard({ entity }: { entity: AllEntitiesCardData }) {
    const [showNames, setShowNames] = useState(false);
    const borderColor = getBorderColor(entity.entityType);

    const sortedNames = [...entity.EntityNames].sort((a, b) => {
        const yearDiff = (a.startYear ?? 0) - (b.startYear ?? 0);
        if (yearDiff !== 0) return yearDiff;
        return a.language.localeCompare(b.language);
    });

    const allCountries = entity.EntitiesInCountries
        .map((eic) => eic.Countries)
        .filter((country, idx, arr) =>
            arr.findIndex((c) => c.countrycodePolpal === country.countrycodePolpal) === idx
        );

    return (
        <section
            className={`border border-gray-200 border-l-4 border-r-4 ${borderColor} p-2 bg-white shadow-sm space-y-2`}
        >
            {/*
              Grid columns (10 on lg, 9 on sm, 4 on mobile):
              [toggle | polpalId | color-dot | nameShort | nameEnglish | name | type | flag | wikipedia | wikidata]
            */}
            <div
                className={`grid grid-cols-[1rem_4rem_0.75rem_5rem] sm:grid-cols-[1rem_4rem_0.75rem_5rem_1fr_1fr_6rem_2rem_2rem_2rem] lg:grid-cols-[1rem_4rem_0.75rem_5rem_1fr_1fr_6rem_2rem_2rem_2rem] items-center gap-2 min-w-0 ${sortedNames.length > 0 ? "cursor-pointer" : ""}`}
                onClick={() => { if (sortedNames.length > 0) setShowNames((v) => !v); }}
            >
                {/* Toggle chevron */}
                <div className="flex items-center justify-left">
                    {sortedNames.length > 0 ? (
                        <button
                            type="button"
                            className="text-gray-400 hover:text-primary/90 transition-colors"
                            onClick={(e) => { e.stopPropagation(); setShowNames((v) => !v); }}
                            aria-label={showNames ? "Hide historical names" : "Show historical names"}
                        >
                            {showNames ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                    ) : null}
                </div>

                {/* PolPaL ID */}
                <span className="text-gray-500 truncate text-xs text-left">
                    <Link
                        href={`/data/entities/${entity.polpalId}`}
                        className="text-primary font-semibold hover:underline hover:text-primary/90"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {entity.polpalId}
                    </Link>
                </span>

                {/* Color dot */}
                <div className="flex items-center justify-center">
                    {entity.color && (
                        <span
                            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: `#${entity.color}` }}
                        />
                    )}
                </div>

                {/* Short name */}
                <span className="text-gray-800 truncate text-xs text-left" title={entity.nameEnglish}>
                    <Link
                        href={`/data/entities/${entity.polpalId}`}
                        className="hover:underline hover:text-primary/90"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {entity.nameShort}
                    </Link>
                </span>

                {/* English name — hidden on mobile */}
                <span className="hidden sm:block text-gray-600 truncate text-xs text-left px-5" title={entity.nameEnglish}>
                    <Link
                        href={`/data/entities/${entity.polpalId}`}
                        className="hover:underline hover:text-primary/90"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {entity.nameEnglish}
                    </Link>
                </span>

                {/* Name — hidden on mobile */}
                <span className="hidden sm:block text-gray-600 truncate text-xs text-left px-5" title={entity.name}>
                    <Link
                        href={`/data/entities/${entity.polpalId}`}
                        className="hover:underline hover:text-primary/90"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {entity.name}
                    </Link>
                </span>

                {/* Entity type badge — hidden on mobile */}
                <div className="hidden sm:flex justify-start text-left">
                    <EntityTypeBadge entityType={entity.entityType} size="xs" />
                </div>

                {/* Country flag — its own cell, hidden on mobile */}
                <div
                    className="hidden sm:flex items-center justify-start flex-wrap gap-0.5"
                    onClick={(e) => e.stopPropagation()}
                >
                    {allCountries.map((country) => (
                        <Link
                            href={`/data/countries/${country.countrycodePolpal}`}
                            key={country.countrycodePolpal}
                        >
                            <CountryFlag
                                iso2c={country.iso2c ?? ""}
                                countrycodePolpal={country.countrycodePolpal}
                                countryname={country.countryname}
                                size={30}
                            />
                        </Link>
                    ))}
                </div>

                {/* Wikipedia & Wikidata button — hidden on mobile */}
                <div className="hidden sm:flex items-center justify-start px-2" onClick={(e) => e.stopPropagation()}>
                    {entity.wikipediaUrl && (
                        <ButtonWikipedia
                            href={entity.wikipediaUrl}
                            ariaLabel={`Wikipedia page of ${entity.nameShort}`}
                            size="xs"
                        />
                    )}
                    {entity.wikidataId && (
                        <div className="ml-1">
                            <ButtonWikidata
                                href={entity.wikidataId}
                                text=""
                                ariaLabel={`Wikidata page of ${entity.nameShort}`}
                                size="xs"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Historical names — expanded panel */}
            {showNames && sortedNames.length > 0 && (
                <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 bg-gray-50">
                    {sortedNames.map((n, i) => (
                        <div
                            key={i}
                            className="grid grid-cols-[6.75rem_5rem] sm:grid-cols-[6.75rem_5rem_1fr_1fr] lg:grid-cols-[6.75rem_5rem_1fr_6rem_9rem_7rem] items-center gap-2 px-3 py-1.5 text-xs"
                        >
                            <span className="text-gray-500 truncate text-left" />
                            <span className="text-gray-700 truncate text-left">{n.nameShort || "—"}</span>
                            <span className="hidden sm:block text-gray-700 truncate text-left px-5">{n.name}</span>
                            <span className="hidden lg:flex text-gray-400 truncate text-left justify-start">
                                {LANGUAGE_NAME_MAP[n.language as keyof typeof LANGUAGE_NAME_MAP] ?? n.language} ({n.language})
                            </span>
                            <span className="hidden sm:block text-gray-400 text-left justify-start whitespace-nowrap px-3">
                                {formatPartialDate(n.startYear, n.startMonth, n.startDay) || "?"}
                                {" → "}
                                {formatPartialDate(n.endYear, n.endMonth, n.endDay) || "?"}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
