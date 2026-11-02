"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { EntityTypeBadge } from "@/components/ui/EntityTypeBadge";
import { EntityTypesEnum, LanguageCodeEnum } from "@/lib/shared/enums";
import { formatPartialDate } from "@/lib/shared/utils";
import { ButtonPartyFacts, ButtonWikidata, ButtonWikipedia } from "@/components/ui/Buttons";
import { LANGUAGE_NAME_MAP } from "@/lib/shared/mapping";

/** Remove text duplicated by Commons (e.g. "Unknown author Unknown author" → "Unknown author"). */
const dedup = (s: string) => s.replace(/^(.+?) ?\1$/, '$1');

export interface EntityCardEntity {
  polpalId: number;
  partyfactsId?: number | null;
  nameEnglish: string;
  nameShort: string;
  name: string;
  entityType: EntityTypesEnum;
  wikipediaUrl?: string | null;
  wikidataId?: string | null;
  EntityNames: {
    entityNameId: number;
    nameShort: string;
    name: string;
    language: LanguageCodeEnum;
    startYear: number | null;
    startMonth: number | null;
    startDay: number | null;
    endYear: number | null;
    endMonth: number | null;
    endDay: number | null;
  }[];
  appearanceFirst?: number | null;
  appearanceLast?: number | null;
  EntitiesInCountries?: { countrycodePolpal: string; Countries: { countryname: string } | null }[];
}

export interface FormDataLinkOptions {
  startYear?: number | null;
  startMonth?: number | null;
  startDay?: number | null;
  endYear?: number | null;
  endMonth?: number | null;
  endDay?: number | null;
  comment?: string | null;
}

export interface EntityCardValidationProps {
  isCreator: boolean;
  creatorMessage?: string;
  approvedCount: number;
  rejectedCount: number;
  currentUserVote: 'APPROVED' | 'REJECTED' | 'NONE' | 'MIXED' | null;
  commentsWithVotes: { userId: number | null; verified: 'APPROVED' | 'REJECTED' | 'NONE'; comment: string | null; updatedAt: string; observationDate?: { year?: number | null; month?: number | null; day?: number | null } | null }[];
  submitting: boolean;
  currentUserId: number | null;
  onVote?: (verdict: 'APPROVED' | 'REJECTED', comment: string | null) => void;
  onRemove?: () => void;
  allowCommentEdit?: boolean;
}

type Attribution = {
  artist: string;
  credit: string;
  license: string;
  filePageUrl: string;
  restrictions: string;
};

type LogoCacheEntry = { url: string | null; attribution: Attribution | null };

// Module-level cache so logo URLs persist across filter/search-driven remounts
const logoCache = new Map<string, LogoCacheEntry>();
// Module-level cache so color hex values persist across filter/search-driven remounts
const colorCache = new Map<string, string | null>();

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

export function EntityCard({
  entity,
  onLink,
  onUnlink,
  submitting,
  deleting,
  observationDates,
  linkStart,
  linkEnd,
  showLogo = false,
  isLoggedIn = false,
  validation,
  linkComments,
  defaultShowComments = false,
  useGridLayout = false,
  hideLinkButton = false,
  hideAppearance = false,
}: {
  entity: EntityCardEntity;
  onLink?: (data: FormDataLinkOptions) => void;
  onUnlink?: () => void;
  submitting?: boolean;
  deleting?: boolean;
  observationDates?: { year?: number | null; month?: number | null; day?: number | null }[];
  linkStart?: { year?: number | null; month?: number | null; day?: number | null };
  linkEnd?: { year?: number | null; month?: number | null; day?: number | null };
  linkComments?: { comment: string | null; observationDate?: { year?: number | null; month?: number | null; day?: number | null } | null }[];
  showLogo?: boolean;
  isLoggedIn?: boolean;
  validation?: EntityCardValidationProps;
  defaultShowComments?: boolean;
  useGridLayout?: boolean;
  hideLinkButton?: boolean;
  hideAppearance?: boolean;
}) {
  const [showAdditionalNames, setShowAdditionalNames] = useState(false);
  const [showAllObservations, setShowAllObservations] = useState(false);
  const [linkData, setLinkData] = useState<FormDataLinkOptions>({});
  const borderColor = getBorderColor(entity.entityType);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoAttribution, setLogoAttribution] = useState<Attribution | null>(null);
  const [loadingLogo, setLoadingLogo] = useState(false);
  const [logoFetchAttempted, setLogoFetchAttempted] = useState(false);
  const [colorHex, setColorHex] = useState<string | null>(null);
  const [, setLoadingColor] = useState(false);
  const [colorFetchAttempted, setColorFetchAttempted] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [showComments, setShowComments] = useState(defaultShowComments);
  const [showLinkComments, setShowLinkComments] = useState(defaultShowComments);
  const [isEditingComment, setIsEditingComment] = useState(false);

  const handleLinkFieldChange = (updates: Partial<FormDataLinkOptions>) => {
    const next = { ...linkData, ...updates };
    setLinkData(next);
    if (hideLinkButton && onLink) {
      onLink(next);
    }
  };

  const fetchLogo = useCallback(async () => {
    {/* 
    const qNumber = wikidataId.includes('/') ? wikidataId.split('/').pop() : wikidataId;
    if (!qNumber || !/^Q\d+$/.test(qNumber)) { setLogoFetchAttempted(true); return; }
    if (logoCache.has(qNumber)) {
      const cached = logoCache.get(qNumber)!;
      if (cached.url) setLogoUrl(cached.url);
      if (cached.attribution) setLogoAttribution(cached.attribution);
      setLogoFetchAttempted(true);
      return;
    }
    setLoadingLogo(true);
    setLogoFetchAttempted(true);
    try {
      const res = await fetch(`/api/wikidata-logo?id=${qNumber}`, { credentials: "include" });
      if (!res.ok) { logoCache.set(qNumber, { url: null, attribution: null }); return; }
      const data = await res.json();
      const url = data.logoUrl ?? null;
      const attribution = data.attribution ?? null;
      logoCache.set(qNumber, { url, attribution });
      if (url) setLogoUrl(url);
      if (attribution) setLogoAttribution(attribution);
    } catch {
      logoCache.set(qNumber, { url: null, attribution: null });
      // silently ignore logo fetch errors
    } finally {
      setLoadingLogo(false);
    }
    */}
    setLoadingLogo(false); // Temporarily disable logo fetching until we have figured out copyright/license issues
    setLogoUrl(null); // Temporarily disable logo fetching until we have figured out copyright/license issues
    setLogoAttribution(null); // Temporarily disable logo fetching until we have figured out copyright/license issues
  }, []);

  const fetchColor = useCallback(async (wikidataId: string) => {
    const qNumber = wikidataId.includes('/') ? wikidataId.split('/').pop() : wikidataId;
    if (!qNumber || !/^Q\d+$/.test(qNumber)) { setColorFetchAttempted(true); return; }
    if (colorCache.has(qNumber)) {
      const cached = colorCache.get(qNumber) ?? null;
      if (cached) setColorHex(cached);
      setColorFetchAttempted(true);
      return;
    }
    setLoadingColor(true);
    setColorFetchAttempted(true);
    try {
      const res = await fetch(`/api/wikidata-color?id=${qNumber}`);
      if (!res.ok) { colorCache.set(qNumber, null); return; }
      const data = await res.json();
      const hex: string | null = data.color ?? null;
      colorCache.set(qNumber, hex);
      if (hex) setColorHex(hex);
    } catch {
      colorCache.set(qNumber, null);
    } finally {
      setLoadingColor(false);
    }
  }, []);

  useEffect(() => {
    if (showLogo && entity.wikidataId && !logoFetchAttempted) {
      const qNumber = entity.wikidataId.includes('/') ? entity.wikidataId.split('/').pop() : entity.wikidataId;
      if (qNumber && logoCache.has(qNumber)) {
        const cached = logoCache.get(qNumber)!;
        if (cached.url) setLogoUrl(cached.url);
        if (cached.attribution) setLogoAttribution(cached.attribution);
        setLogoFetchAttempted(true);
        return;
      }
      fetchLogo();
    }
  }, [showLogo, entity.wikidataId, logoFetchAttempted, fetchLogo]);

  useEffect(() => {
    if (entity.wikidataId && !colorFetchAttempted) {
      const qNumber = entity.wikidataId.includes('/') ? entity.wikidataId.split('/').pop() : entity.wikidataId;
      if (qNumber && colorCache.has(qNumber)) {
        const cached = colorCache.get(qNumber) ?? null;
        if (cached) setColorHex(cached);
        setColorFetchAttempted(true);
        return;
      }
      fetchColor(entity.wikidataId);
    }
  }, [entity.wikidataId, colorFetchAttempted, fetchColor]);

  return (
    <div>
      <section className={`relative border border-gray-200 border-l-4 ${borderColor} rounded-lg p-5 bg-white shadow-sm space-y-3`}>


        {/* Name Section + action buttons */}
        <div className="flex flex-row-reverse flex-wrap items-start gap-2 mt-1">
          {/* Buttons: flex-row-reverse places these on the right; when card is too narrow they wrap to their own row above the content */}
          <div className="flex gap-1 items-center shrink-0 text-primary hover:text-primary/90">
            {entity?.partyfactsId && (
              <ButtonPartyFacts
                href={entity.partyfactsId}
                ariaLabel={"Party Facts page of " + entity.nameShort}
                size="xs"
              />
            )}
            {entity?.wikipediaUrl && (
              <ButtonWikipedia
                href={entity.wikipediaUrl}
                ariaLabel={"Wikipedia page of " + entity.nameShort}
                size="xs"
              />
            )}
            {entity?.wikidataId && (
              <ButtonWikidata
                href={entity.wikidataId}
                ariaLabel={"Wikidata page of " + entity.nameShort}
                size="xs"
              />
            )}
            {onUnlink && isLoggedIn && (
              <button
                type="button"
                disabled={deleting}
                className="p-0.5 text-red-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Remove link"
                aria-label="Remove link"
                onClick={(e) => { e.stopPropagation(); if (window.confirm("Are you sure you want to remove this link?")) onUnlink(); }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
          {/* Name content: basis-48 means when container < ~270px the content wraps below the buttons */}
          <div className="flex grow shrink basis-48 min-w-0 gap-2 items-end">
            {colorHex && (
              <div
                className="flex-shrink-0 self-end mb-1 w-2 h-16 rounded"
                style={{ backgroundColor: `#${colorHex}` }}
                title={`Color: #${colorHex}`}
              />
            )}
            {showLogo && (loadingLogo || logoUrl) && (
              <div className="flex-shrink-0 self-end mb-1">
                {loadingLogo && (
                  <div className="w-25 h-25 bg-gray-100 rounded flex items-center justify-center">
                    <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                  </div>
                )}
                {logoUrl && !loadingLogo && (
                  <div className="flex flex-col items-center gap-0.5">
                    {logoAttribution ? (
                      <a
                        href={logoAttribution.filePageUrl || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] text-gray-400 hover:text-gray-600 leading-tight text-center max-w-[6rem] truncate"
                        title={`${dedup(logoAttribution.artist) || dedup(logoAttribution.credit)} · ${logoAttribution.license}${logoAttribution.restrictions?.includes('trademarked') ? ' ™' : ''}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {dedup(logoAttribution.artist) || dedup(logoAttribution.credit)
                          ? `© ${dedup(logoAttribution.artist) || dedup(logoAttribution.credit)}`
                          : null}
                        {(dedup(logoAttribution.artist) || dedup(logoAttribution.credit)) && logoAttribution.license ? ' · ' : null}
                        {logoAttribution.license || null}
                        {logoAttribution.restrictions?.includes('trademarked') ? ' ™' : null}
                      </a>
                    ) : (
                      <a
                        href={`https://www.wikidata.org/wiki/${entity.wikidataId?.includes('/') ? entity.wikidataId.split('/').pop() : entity.wikidataId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] text-gray-400 hover:text-gray-600 leading-tight text-center max-w-[6rem] truncate"
                        title="View on Wikidata"
                        onClick={(e) => e.stopPropagation()}
                      >
                        © Wikidata/Wikimedia Commons
                      </a>
                    )}
                    <div className="w-25 h-25 bg-gray-50 flex items-center justify-center rounded overflow-hidden border border-gray-200">
                      <Image
                        src={logoUrl}
                        alt={`${entity.nameShort} logo`}
                        width={100}
                        height={100}
                        className="w-full h-full object-contain"
                        unoptimized
                        onError={() => setLogoUrl(null)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="text-gray-700 text-xs min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <EntityTypeBadge entityType={entity.entityType} size="xs" />
              </div>
              <div className="mt-2 px-2 rounded text-gray-600">
                PolPaL ID: <span className="font-mono"><Link className="text-primary hover:underline" href={`/data/entities/${entity.polpalId}`}>{entity.polpalId}</Link></span>
              </div>
              <div className="mt-1 px-2">{entity?.nameShort}</div>
              <div className="mt-1 px-2">{entity?.nameEnglish}</div>
              <div className="mt-1 px-2">{entity?.name}</div>
            </div>
          </div>
        </div>

        {/* Additional Names Section */}
        {entity.EntityNames.length > 0 && (
          <>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary/90 transition-colors"
              onClick={(e) => { e.stopPropagation(); setShowAdditionalNames((v) => !v); }}
            >
              {showAdditionalNames ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showAdditionalNames ? "Hide additional names" : "Show additional names"}
            </button>
            {showAdditionalNames && (
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 bg-gray-50">
                {entity.EntityNames.map((hn) => (
                  <div key={hn.entityNameId} className="flex items-start gap-3 px-4 py-2">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs text-gray-800 font-medium">{hn.nameShort}</span>
                      {hn.name !== hn.nameShort && <span className="text-xs text-gray-500">{hn.name}</span>}
                    </div>
                    <div className="flex flex-col items-end ml-auto shrink-0 gap-0.5">
                      <span className="text-xs text-gray-500 font-mono" title={hn.language}>{LANGUAGE_NAME_MAP[hn.language as keyof typeof LANGUAGE_NAME_MAP] ?? hn.language} ({hn.language})</span>
                      {(hn.startYear || hn.endYear) && (
                        <span className="text-xs text-gray-500">
                          {formatPartialDate(hn.startYear, hn.startMonth, hn.startDay) || '?'}
                          {' → '}
                          {formatPartialDate(hn.endYear, hn.endMonth, hn.endDay) || '?'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div className={useGridLayout ? "grid grid-cols-2 gap-4" : "flex flex-col gap-1 space-y-1"}>

          {/* Link validity dates - shown when no observation dates (or all dateless) but link has start/end dates */}
          {(!observationDates || observationDates.length === 0 || observationDates.every(d => !d.year)) && (linkStart?.year || linkEnd?.year) && (
            <div className="text-xs text-gray-500 border-t pt-1 mt-1">
              <div className="font-medium">Valid Time Period:</div>
              <div className="flex gap-1">
                <span>{formatPartialDate(linkStart?.year, linkStart?.month, linkStart?.day, "") || <span className="italic text-gray-400">no start</span>}</span>
                <span className="text-gray-300">–</span>
                <span>{formatPartialDate(linkEnd?.year, linkEnd?.month, linkEnd?.day, "") || <span className="italic text-gray-400">no end</span>}</span>
              </div>
            </div>
          )}

          {/* Observation dates - shown when observationDates is provided and at least one has a year, and not in linking mode */}
          {!onLink && observationDates && observationDates.some(d => d.year) && (
            <div className="text-xs text-gray-500 border-t pt-1 mt-1">
              <div className="font-medium">{onLink ? "Linking Observation(s):" : "Linked Observation(s):"}</div>
              <div className="flex flex-col gap-0.5">
                {(showAllObservations ? observationDates : observationDates.slice(0, 2)).map((d, i) => (
                  <span key={i} className="whitespace-nowrap">
                    {formatPartialDate(d.year, d.month, d.day, "") || <span className="italic text-gray-500">no date</span>}
                  </span>
                ))}
                {observationDates.length > 2 && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary/90 transition-colors"
                    onClick={(e) => { e.stopPropagation(); setShowAllObservations((v) => !v); }}
                  >
                    {showAllObservations ? "show less" : `+${observationDates.length - 2} more`}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Link details section - entity appearance dates */}
          {!hideAppearance && (
          <div className="text-xs text-gray-500 border-t pt-1 mt-1">
            <div className="font-medium">Entity Appearance:</div>
            <div className="flex gap-1">
              <span>{entity.appearanceFirst ?? <span className="italic text-gray-400">no start</span>}</span>
              <span className="text-gray-300">–</span>
              <span>{entity.appearanceLast ?? <span className="italic text-gray-400">no end</span>}</span>
            </div>
          </div>
          )}

          {linkComments && linkComments.some(c => c.comment && c.comment.trim()) && (
            <div className="text-xs text-gray-500 border-t pt-1 mt-1">
              <div className="flex items-center gap-1">
                <span className="font-medium">Comment (link):</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowLinkComments(v => !v); }}
                  title={showLinkComments ? 'Hide link comments' : 'Show link comments'}
                  className="text-gray-400 hover:text-gray-600 text-xs ml-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 inline" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12h-8v-2h8v2zm0-4h-8V8h8v2z" /></svg> ({linkComments.filter(c => c.comment && c.comment.trim()).length})
                </button>
              </div>
              {showLinkComments && (
                <div className="flex flex-col gap-0.5 mt-0.5">
                  {linkComments.filter(c => c.comment && c.comment.trim()).map((c, i) => (
                    <div key={i}>
                      {c.observationDate && (
                        <span className="font-medium not-italic mr-1">{formatPartialDate(c.observationDate.year, c.observationDate.month, c.observationDate.day, "") || <span className="italic">no date</span>}:</span>
                      )}
                      <span className="italic">&ldquo;{c.comment}&rdquo;</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Validation section */}
          {validation && (
            <div className="text-xs border-t pt-1 mt-1">
              <div className="font-medium text-gray-500 mb-1">User Validation:</div>
              {validation.isCreator && (
                <div className="flex items-center gap-1 text-gray-400 text-xs mb-1" title={validation.creatorMessage ?? 'You created this link'}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>{validation.creatorMessage ?? 'You linked this'}</span>
                </div>
              )}
              <div className="flex items-center gap-2 mb-1">
                {validation.currentUserVote === 'MIXED' && validation.onVote ? (
                  /* MIXED state: user voted differently across individual observations.
                     Show counts as neutral spans + a warning badge that removes all votes when clicked. */
                  <>
                    <span className="flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium bg-white border-gray-300 text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                      </svg>
                      <span>{validation.approvedCount}</span>
                    </span>
                    <span className="flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium bg-white border-gray-300 text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                      </svg>
                      <span>{validation.rejectedCount}</span>
                    </span>
                    <button
                      type="button"
                      disabled={validation.submitting}
                      onClick={() => validation.onRemove?.()}
                      title="You voted differently on individual observations — click to remove all your votes"
                      className="flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium transition-colors bg-amber-50 border-amber-400 text-amber-700 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      </svg>
                      Mixed
                    </button>
                  </>
                ) : (
                  <>
                    {validation.onVote ? (
                      <button
                        type="button"
                        disabled={validation.submitting || validation.isCreator}
                        onClick={() => {
                          if (validation.currentUserVote === 'APPROVED') {
                            validation.onRemove?.();
                          } else {
                            const existingComment = validation.commentsWithVotes.find(v => v.userId === validation.currentUserId)?.comment ?? null;
                            validation.onVote!('APPROVED', existingComment);
                          }
                        }}
                        title={validation.isCreator ? 'Cannot validate your own link' : 'Approve'}
                        className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${validation.currentUserVote === 'APPROVED'
                          ? 'bg-green-100 border-green-400 text-green-700 hover:bg-green-200'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-green-50 hover:border-green-300'
                          }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill={validation.currentUserVote === 'APPROVED' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                        <span>{validation.approvedCount}</span>
                      </button>
                    ) : (
                      <span className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium cursor-default ${validation.currentUserVote === 'APPROVED' ? 'bg-green-100 border-green-400 text-green-700' : 'bg-white border-gray-300 text-gray-500'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill={validation.currentUserVote === 'APPROVED' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                        <span>{validation.approvedCount}</span>
                      </span>
                    )}
                    {validation.onVote ? (
                      <button
                        type="button"
                        disabled={validation.submitting || validation.isCreator}
                        onClick={() => {
                          if (validation.currentUserVote === 'REJECTED') {
                            validation.onRemove?.();
                          } else {
                            const existingComment = validation.commentsWithVotes.find(v => v.userId === validation.currentUserId)?.comment ?? null;
                            validation.onVote!('REJECTED', existingComment);
                          }
                        }}
                        title={validation.isCreator ? 'Cannot validate your own link' : 'Reject'}
                        className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${validation.currentUserVote === 'REJECTED'
                          ? 'bg-red-100 border-red-400 text-red-700 hover:bg-red-200'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-red-50 hover:border-red-300'
                          }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill={validation.currentUserVote === 'REJECTED' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                        </svg>
                        <span>{validation.rejectedCount}</span>
                      </button>
                    ) : (
                      <span className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium cursor-default ${validation.currentUserVote === 'REJECTED' ? 'bg-red-100 border-red-400 text-red-700' : 'bg-white border-gray-300 text-gray-500'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill={validation.currentUserVote === 'REJECTED' ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                        </svg>
                        <span>{validation.rejectedCount}</span>
                      </span>
                    )}
                  </>
                )}
                {validation.commentsWithVotes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowComments(v => !v)}
                    title={showComments ? 'Hide comments' : 'Show comments'}
                    className="text-gray-400 hover:text-gray-600 text-xs ml-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 inline" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12h-8v-2h8v2zm0-4h-8V8h8v2z" /></svg> ({validation.commentsWithVotes.length})
                  </button>
                )}
              </div>
              {showComments && (
                <div className="mt-1 flex flex-col gap-1">
                  {validation.commentsWithVotes.map((v, i) => (
                    <div key={i} className={`rounded px-2 py-1 text-xs border ${v.verified === 'APPROVED' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                      {v.observationDate && (
                        <span className="font-medium not-italic mr-1">{formatPartialDate(v.observationDate.year, v.observationDate.month, v.observationDate.day, "") || <span className="italic text-gray-500">no date</span>}:</span>
                      )}
                      <span className="italic">&ldquo;{v.comment}&rdquo;</span>
                      {v.userId === validation.currentUserId && <span className="ml-1 font-medium not-italic">(you)</span>}
                    </div>
                  ))}
                </div>
              )}
              {validation.currentUserVote && validation.currentUserVote !== 'NONE' && validation.allowCommentEdit && (() => {
                const savedComment = validation.commentsWithVotes.find(v => v.userId === validation.currentUserId)?.comment ?? null;
                if (isEditingComment || !savedComment) {
                  return (
                    <div className="mt-1 flex flex-col gap-1">
                      <textarea
                        aria-label="Edit comment"
                        className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                        rows={2}
                        placeholder="Add a comment (optional)"
                        value={commentInput !== "" ? commentInput : (savedComment ?? "")}
                        onChange={(e) => setCommentInput(e.target.value)}
                      />
                      <div className="flex gap-1 self-end">
                        {isEditingComment && (
                          <button
                            type="button"
                            onClick={() => { setIsEditingComment(false); setCommentInput(""); }}
                            className="px-2 py-0.5 rounded border border-gray-300 bg-white text-xs text-gray-500 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={validation.submitting}
                          onClick={() => {
                            if (!validation.currentUserVote || validation.currentUserVote === 'NONE' || validation.currentUserVote === 'MIXED') return;
                            validation.onVote?.(validation.currentUserVote, commentInput.trim() || null);
                            setIsEditingComment(false);
                            setCommentInput("");
                          }}
                          className="px-2 py-0.5 rounded border border-gray-300 bg-white text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Save comment
                        </button>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="mt-1 flex items-start gap-1">
                    <span className="italic text-gray-500 text-xs flex-1 truncate">&ldquo;{savedComment}&rdquo;</span>
                    <button
                      type="button"
                      disabled={validation.submitting}
                      onClick={() => { setIsEditingComment(true); setCommentInput(savedComment ?? ""); }}
                      title="Edit comment"
                      aria-label="Edit comment"
                      className="shrink-0 p-0.5 rounded border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      disabled={validation.submitting}
                      onClick={() => {
                        if (!validation.currentUserVote || validation.currentUserVote === 'NONE' || validation.currentUserVote === 'MIXED') return;
                        validation.onVote?.(validation.currentUserVote, null);
                      }}
                      title="Delete comment"
                      aria-label="Delete comment"
                      className="shrink-0 p-0.5 rounded border border-gray-300 bg-white text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Link to entries section - only shown when an onLink callback is provided */}
        {onLink && (
          <div className="mt-2 border-t pt-2">
            <form onSubmit={(e) => { e.preventDefault(); onLink(linkData); }}>
              <div className="flex flex-col gap-2 mb-2">
                {/* Start Date and End Date - only shown when no date is available */}
                {(!observationDates || observationDates.length === 0 || observationDates.every(d => !d.year)) && (
                  <div className="flex flex-wrap items-end gap-3">
                    {/* Start Date */}
                    <div className="flex flex-col">
                      <label className="text-xs text-gray-600 mb-1">Start Date</label>
                      <div className="flex gap-1">
                        <input aria-label="Start year" type="number" placeholder="Year" className="w-20 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary" name="startYear" value={linkData.startYear ?? ""} onChange={(e) => handleLinkFieldChange({ startYear: e.target.value ? Number(e.target.value) : null })} />
                        <input aria-label="Start month" type="number" placeholder="MM" min={1} max={12} className="w-14 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary" name="startMonth" value={linkData.startMonth ?? ""} onChange={(e) => handleLinkFieldChange({ startMonth: e.target.value ? Number(e.target.value) : null })} />
                        <input aria-label="Start day" type="number" placeholder="DD" min={1} max={31} className="w-14 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary" name="startDay" value={linkData.startDay ?? ""} onChange={(e) => handleLinkFieldChange({ startDay: e.target.value ? Number(e.target.value) : null })} />
                      </div>
                    </div>
                    {/* End Date */}
                    <div className="flex flex-col">
                      <label className="text-xs text-gray-600 mb-1">End Date</label>
                      <div className="flex gap-1">
                        <input aria-label="End year" type="number" placeholder="Year" className="w-20 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary" name="endYear" value={linkData.endYear ?? ""} onChange={(e) => handleLinkFieldChange({ endYear: e.target.value ? Number(e.target.value) : null })} />
                        <input aria-label="End month" type="number" placeholder="MM" min={1} max={12} className="w-14 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary" name="endMonth" value={linkData.endMonth ?? ""} onChange={(e) => handleLinkFieldChange({ endMonth: e.target.value ? Number(e.target.value) : null })} />
                        <input aria-label="End day" type="number" placeholder="DD" min={1} max={31} className="w-14 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary" name="endDay" value={linkData.endDay ?? ""} onChange={(e) => handleLinkFieldChange({ endDay: e.target.value ? Number(e.target.value) : null })} />
                      </div>
                    </div>
                  </div>
                )}
                {/* Comment */}
                <div className="flex flex-col">
                  <label className="text-xs text-gray-600 mb-1">Comment</label>
                  <input aria-label="Comment" type="text" className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary" name="comment" value={linkData.comment ?? ""} onChange={(e) => handleLinkFieldChange({ comment: e.target.value || null })} />
                </div>
              </div>
              {/* Submit button */}
              {!hideLinkButton && (
                <button type="submit" disabled={submitting} className="self-end px-3 py-1 bg-primary text-white rounded text-xs hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
                  {submitting ? "Linking…" : "Link Entity"}
                </button>
              )}
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
