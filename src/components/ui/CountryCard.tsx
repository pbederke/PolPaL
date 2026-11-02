"use client";

import { useState } from "react";
import Link from "next/link";
import CountryFlag from "@/components/ui/DisplayFlags";
import { ButtonWikidata, ButtonWikipedia } from "@/components/ui/Buttons";

export interface CountryCardCountry {
  countrycodePolpal: string;
  countryname: string;
  iso2c?: string | null;
  iso3c?: string | null;
  region?: string | null;
  regionSub?: string | null;
  wikidataId?: string | null;
  wikipediaUrl?: string | null;
}

export function CountryCard({
  country,
  entityCount,
  comment,
}: {
  country: CountryCardCountry;
  entityCount?: number;
  comment?: string | null;
}) {
  const codes = [country.countrycodePolpal, country.iso2c, country.iso3c]
    .filter(Boolean)
    .join(" · ");

  const COMMENT_LIMIT = 150;
  const [commentExpanded, setCommentExpanded] = useState(false);
  const isLong = !!comment && comment.length > COMMENT_LIMIT;
  const displayedComment = isLong && !commentExpanded ? comment.slice(0, COMMENT_LIMIT).trimEnd() + "…" : comment;

  return (
    <section className="relative border border-gray-200 border-l-4 border-l-gray-300 border-r-gray-300 rounded-lg p-4 bg-white shadow-sm">
      {/* Flag + name + external link buttons */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex-shrink-0">
            <CountryFlag
              iso2c={country.iso2c}
              countrycodePolpal={country.countrycodePolpal}
              countryname={country.countryname}
              size={40}
            />
          </div>
          <div className="min-w-0 flex-1">
            <Link
              href={`/data/countries/${country.countrycodePolpal}`}
              className="font-semibold text-sm text-gray-900 hover:text-primary hover:underline leading-tight"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              {country.countryname}
            </Link>
            <div className="text-xs font-mono text-gray-500">{codes}</div>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0 items-start">
          {country.wikipediaUrl && (
            <ButtonWikipedia
              href={country.wikipediaUrl}
              ariaLabel={`Wikipedia page of ${country.countryname}`}
              size="xs"
            />
          )}
          {country.wikidataId && (
            <ButtonWikidata
              href={country.wikidataId}
              ariaLabel={`Wikidata page of ${country.countryname}`}
              size="xs"
            />
          )}
        </div>
      </div>

      {/* Region + entity count */}
      <div className="mt-2.5 flex items-end justify-between gap-2">
        <div className="text-xs text-gray-400 leading-snug">
          {[country.region, country.regionSub].filter(Boolean).join(" › ") || (
            <span className="italic">No region</span>
          )}
        </div>
        {entityCount !== undefined && (
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
            {entityCount} {entityCount === 1 ? "entity" : "entities"}
          </span>
        )}
      </div>
      {comment && (
        <div className="mt-2.5 border-t border-gray-100 pt-2 text-xs text-gray-500 italic leading-snug whitespace-pre-wrap text-justify">
          {displayedComment}
          {isLong && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setCommentExpanded((v) => !v); }}
              className="ml-1.5 not-italic text-primary hover:underline focus:outline-none"
            >
              {commentExpanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
