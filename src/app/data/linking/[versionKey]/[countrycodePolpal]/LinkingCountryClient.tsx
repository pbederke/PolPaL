"use client";

// Core React and Next.js imports
import { Fragment, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

// Local imports - Context and Configuration
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import NotFoundState from "@/components/ui/NotFoundState";

// Local imports - Components
import CountryFlag from "@/components/ui/DisplayFlags";
import { EntityTypesEnum, LanguageCodeEnum } from "@/lib/shared/enums";
import { dateSortValue } from "@/lib/shared/utils";
import { ButtonDownload } from "@/components/ui/Buttons";
import ReactMarkdown from "react-markdown";
import { EntityCard, FormDataLinkOptions } from "@/components/ui/EntityCard";
import { EntryCard } from "@/components/ui/EntryCard";
import { EntityTypeBadge } from "@/components/ui/EntityTypeBadge";
import { VariableDocumentation, type Variable } from "@/components/ui/VariableDocumentation";

interface EntitiesInCountries {
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
    comment: string | null;
  }[];
  appearanceFirst: number | null;
  appearanceLast: number | null;
}

interface Entries {
  projectIsHidden: boolean;
  projectKey: string;
  projectNameShort: string;
  projectName: string;
  datasetIsHidden: boolean;
  datasetKey: string;
  datasetNameShort: string;
  datasetName: string;
  versionIsHidden: boolean;
  versionIsHiddenReason: string | null;
  versionKey: string;
  version: string;
  versionName?: string | null;
  versionCommentVersion?: string | null;
  versionCommentEntries?: string | null;
  countrycodePolpal: string | null;
  countryname: string;
  iso2c?: string | null;
  Entries: {
    entryId: string;
    entryYear?: number | null;
    entryMonth?: number | null;
    entryDay?: number | null;
    entryEntityIdVar: string;
    entryEntityId: string;
    entryEntityNameShort?: string | null;
    entryEntityNameEnglish?: string | null;
    entryEntityName?: string | null;
    additionalInformation?: string | null;
    uniqueObservationId: string;
    note?: string | null;
    LinksEntryToEntity: {
      linkEntriesToEntityId: number;
      polpalId: number;
      partyfactsId?: number | null;
      linkCreatorUserId: number | null;
      entityType: EntityTypesEnum;
      entityNameShort: string;
      entityNameEnglish: string;
      entityName: string;
      wikipediaUrl?: string | null;
      wikidataId?: string | null;
      startYear?: number | null;
      startMonth?: number | null;
      startDay?: number | null;
      endYear?: number | null;
      endMonth?: number | null;
      endDay?: number | null;
      comment?: string | null;
      ValidationLinks: {
        userId: number | null;
        verified: 'APPROVED' | 'REJECTED' | 'NONE';
        comment: string | null;
        updatedAt: string;
      }[];
    }[];
  }[];
}

interface EntriesAggregated {
  entryEntityIdVar: string;
  entryEntityId: string;
  namesShort?: string[] | null;
  namesEnglish?: string[] | null;
  names?: string[] | null;
  uniqueObservationIds: string[];
  yearFirst?: number | null;
  yearLast?: number | null;
  monthFirst?: number | null;
  monthLast?: number | null;
  dayFirst?: number | null;
  dayLast?: number | null;
  observationDates: { year?: number | null; month?: number | null; day?: number | null }[];
  AlreadyLinked: {
    polpalId: number;
    partyfactsId?: number | null;
    entityType: EntityTypesEnum;
    entityNameShort: string;
    entityNameEnglish: string;
    entityName: string;
    wikipediaUrl?: string | null;
    wikidataId?: string | null;
    startYear?: number | null;
    startMonth?: number | null;
    startDay?: number | null;
    endYear?: number | null;
    endMonth?: number | null;
    endDay?: number | null;
    comment?: string | null;
    linkComments: { comment: string | null; observationDate: { year?: number | null; month?: number | null; day?: number | null } }[];
    linkEntriesToEntityIds: number[];
    linkCreatorUserIds: (number | null)[];
    ValidationLinks: {
      userId: number | null;
      verified: 'APPROVED' | 'REJECTED' | 'NONE';
      comment: string | null;
      updatedAt: string;
    }[];
  }[];
}

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) {
    const shorter = na.length < nb.length ? na : nb;
    const longer = na.length >= nb.length ? na : nb;
    return shorter.length / longer.length;
  }
  const tokensA = new Set(na.split(" ").filter(Boolean));
  const tokensB = new Set(nb.split(" ").filter(Boolean));
  const intersection = [...tokensA].filter(t => tokensB.has(t)).length;
  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 0 : intersection / union;
}

function stripDigitTokens(name: string): string {
  // Remove individual tokens that are predominantly digits (e.g. "2323131" in "2323131 Social Democratic Party")
  return name.split(/\s+/).filter(token => {
    if (!token) return false;
    const digitCount = (token.match(/\d/g) ?? []).length;
    return digitCount / token.length <= 0.6;
  }).join(" ").trim();
}

function timePenaltyFactor(
  yearFirst: number | null,
  yearLast: number | null,
  appearanceFirst: number | null,
  appearanceLast: number | null,
): number {
  const overshootStart = (appearanceFirst != null && yearFirst != null) ? Math.max(0, appearanceFirst - yearFirst) : 0;
  const overshootEnd = (appearanceLast != null && yearLast != null) ? Math.max(0, yearLast - appearanceLast) : 0;
  const maxOvershoot = Math.max(overshootStart, overshootEnd);
  const steps = Math.ceil(maxOvershoot / 5);
  return Math.max(0, 1 - steps * 0.1);
}

function findBestEntityMatch(
  entryNames: string[],
  entities: EntitiesInCountries[],
  yearFirst: number | null,
  yearLast: number | null,
): number | "" {
  if (entryNames.length === 0 || entities.length === 0) return "";
  // No date info on entry → don't suggest
  if (yearFirst == null && yearLast == null) return "";
  const cleanedEntryNames = entryNames.map(stripDigitTokens).filter(Boolean);
  if (cleanedEntryNames.length === 0) return "";
  let bestScore = 0.7; // Set a threshold to avoid suggesting very weak matches
  let bestId: number | "" = "";
  for (const entity of entities) {
    // No appearance info on entity → don't suggest
    if (entity.appearanceFirst == null && entity.appearanceLast == null) continue;
    const entityNames = [
      entity.nameShort,
      entity.nameEnglish,
      entity.name,
      ...entity.EntityNames.map(en => en.nameShort),
      ...entity.EntityNames.map(en => en.name),
    ].map(n => n ? stripDigitTokens(n) : "").filter(Boolean);
    if (entityNames.length === 0) continue;
    const penalty = timePenaltyFactor(yearFirst, yearLast, entity.appearanceFirst, entity.appearanceLast);
    if (penalty === 0) continue;
    for (const entryName of cleanedEntryNames) {
      for (const entityName of entityNames) {
        const score = tokenSimilarity(entryName, entityName) * penalty;
        if (score > bestScore) {
          bestScore = score;
          bestId = entity.polpalId;
        }
      }
    }
  }
  return bestId;
}

type ValidationVotePublic = { userId: number | null; verified: 'APPROVED' | 'REJECTED' | 'NONE'; comment: string | null; updatedAt: string };

export default function LinkingCountryClient() {

  // Authentication context
  const { auth } = useAuth();
  const isLoggedIn = !!auth?.userId;

  // Get projectKey from URL params
  const params = useParams();
  const versionKey = params.versionKey as string;
  const datasetKey = versionKey.split("-").slice(0, 2).join("-");
  const projectKey = datasetKey.split("-")[0];
  const countrycodePolpal = params.countrycodePolpal as string;

  // State for loading and error handling 
  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState<string | null>(null);

  // Data states
  const [entries, setEntries] = useState<Entries>();
  const [entities, setEntities] = useState<EntitiesInCountries[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);

  async function handleDeleteVariable(variableId: number) {
    const res = await fetch(`/api/variables/${versionKey}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variableId }),
    });
    if (!res.ok) throw new Error(await res.text());
    setVariables(prev => prev.filter(v => v.variableId !== variableId));
  }
  const [selectedEntities, setSelectedEntities] = useState<Record<string, number | "">>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownSearch, setDropdownSearch] = useState("");
  const [submittingLink, setSubmittingLink] = useState<Record<string, boolean>>({});
  const [deletingLink, setDeletingLink] = useState<Record<string, boolean>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showOnlyUnlinked, setShowOnlyUnlinked] = useState(false);
  const [showOnlyMultipleNames, setShowOnlyMultipleNames] = useState(false);
  const [showOnlyMultipleLinked, setShowOnlyMultipleLinked] = useState(false);
  const [showOnlyRejected, setShowOnlyRejected] = useState(false);
  const [filterYearFrom, setFilterYearFrom] = useState<number | "">("");
  const [filterYearTo, setFilterYearTo] = useState<number | "">("");
  const [filterEntityTypes, setFilterEntityTypes] = useState<Set<EntityTypesEnum>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const PAGE_SIZE = 15;
  const [currentPage, setCurrentPage] = useState(1);

  // Validation state: linkEntriesToEntityId → list of votes
  const [validationState, setValidationState] = useState<Record<number, ValidationVotePublic[]>>({});
  const [submittingValidation, setSubmittingValidation] = useState<Record<number, boolean>>({});
  const [aggregateConfirm, setAggregateConfirm] = useState<{
    action: 'vote' | 'remove';
    linkIds: number[];
    verdict?: 'APPROVED' | 'REJECTED';
    comment?: string | null;
    userId: number;
    entityName: string;
    count: number;
  } | null>(null);

  // Close aggregate confirm dialog on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAggregateConfirm(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [aggregateConfirm]);

  // Fetch data when component mounts or when versionKey/countrycodePolpal changes
  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;

    async function fetchData() {
      setLoadingData(true);
      setErrorData(null);

      try {
        // Fetch entries, entities, and links data in parallel for better performance
        const [entryRes, entityRes, varsRes] = await Promise.all([
          // Get entries for the specific version and country
          fetch(
            `/api/entries/${versionKey}/${countrycodePolpal}`,
            {
              credentials: "include",
              signal: signal
            }
          ),
          // Get all entities available in the country
          fetch(
            `/api/entities-in-countries/entities/${countrycodePolpal}`,
            {
              credentials: "include",
              signal: signal
            }
          ),
          // Get variable documentation for this version (public endpoint)
          fetch(`/api/variables/${versionKey}`, { credentials: "include", signal }),
        ]);

        // Check if requests were aborted
        if (signal.aborted) {
          return;
        }

        // Check if all requests were successful
        if (!entryRes.ok) {
          const errorText = await entryRes.text();
          throw new Error(`Failed to fetch entries: ${errorText}`);
        }
        if (!entityRes.ok) {
          const errorText = await entityRes.text();
          throw new Error(`Failed to fetch entities: ${errorText}`);
        }

        // Parse JSON responses
        const entryData: Entries = await entryRes.json();
        const entitiesData: EntitiesInCountries[] = await entityRes.json();

        // Update component state with fetched data
        setEntries(entryData);
        setEntities(entitiesData);

        // Set variable documentation (ignore errors silently)
        if (varsRes.ok) {
          const varsData = await varsRes.json();
          setVariables(varsData.variables ?? []);
        }

        // Seed validation state from the fetched links
        const initValidation: Record<number, ValidationVotePublic[]> = {};
        for (const entry of entryData.Entries) {
          for (const link of entry.LinksEntryToEntity) {
            initValidation[link.linkEntriesToEntityId] = link.ValidationLinks;
          }
        }
        setValidationState(initValidation);
      } catch (err: unknown) {
        // Don't set error if request was aborted (component unmounted)
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('Fetch request was aborted');
          return;
        }

        // Handle any other errors that occurred during fetch
        setErrorData(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        // Only set loading to false if not aborted
        if (!abortController.signal.aborted) {
          setLoadingData(false);
        }
      }
    }

    fetchData();

    // Cleanup function to abort requests if component unmounts or dependencies change
    return () => {
      abortController.abort();
    };
  }, [versionKey, countrycodePolpal]); // Re-run effect when these parameters change

  // Function to trigger download of entries as CSV stream
  function downloadEntriesCsvStream() {
    const link = document.createElement("a");
    link.href = `/api/downloads/entries/${versionKey}/stream?countries=${encodeURIComponent(countrycodePolpal)}`;
    link.click();
  }

  // Auto-suggest best matching entity per row based on name similarity
  useEffect(() => {
    if (!entries || entities.length === 0) return;
    // Build a set of rowKeys that already have at least one linked entity
    const alreadyLinkedKeys = new Set<string>();
    for (const entry of entries.Entries) {
      if (entry.LinksEntryToEntity.length > 0) {
        alreadyLinkedKeys.add(`${entry.entryEntityIdVar}-${entry.entryEntityId}`);
      }
    }
    // Build year range per aggregated rowKey (min/max of non-null entryYear across all sub-entries)
    // Years above 3000 are sentinel/placeholder values and are treated as no date info
    const rowKeyYears = new Map<string, { yearFirst: number | null; yearLast: number | null }>();
    for (const entry of entries.Entries) {
      const rowKey = `${entry.entryEntityIdVar}-${entry.entryEntityId}`;
      const rawYr = entry.entryYear ?? null;
      const yr = rawYr != null && rawYr > 3000 ? null : rawYr;
      const existing = rowKeyYears.get(rowKey);
      if (!existing) {
        rowKeyYears.set(rowKey, { yearFirst: yr, yearLast: yr });
      } else {
        rowKeyYears.set(rowKey, {
          yearFirst: yr != null && (existing.yearFirst == null || yr < existing.yearFirst) ? yr : existing.yearFirst,
          yearLast: yr != null && (existing.yearLast == null || yr > existing.yearLast) ? yr : existing.yearLast,
        });
      }
    }
    const suggestions: Record<string, number | ""> = {};
    const processedKeys = new Set<string>();
    for (const entry of entries.Entries) {
      const rowKey = `${entry.entryEntityIdVar}-${entry.entryEntityId}`;
      const entryNames = [
        entry.entryEntityNameShort,
        entry.entryEntityNameEnglish,
        entry.entryEntityName,
      ].filter((n): n is string => Boolean(n));
      // Suggestion for aggregated row (only process once per aggregated key, skip if already linked)
      if (!processedKeys.has(rowKey)) {
        processedKeys.add(rowKey);
        if (!alreadyLinkedKeys.has(rowKey)) {
          const { yearFirst, yearLast } = rowKeyYears.get(rowKey) ?? { yearFirst: null, yearLast: null };
          const bestId = findBestEntityMatch(entryNames, entities, yearFirst, yearLast);
          if (bestId !== "") suggestions[rowKey] = bestId;
        }
      }
      // Suggestion for individual (sub-row) entry keyed by entryId, skip if already linked
      if (entry.LinksEntryToEntity.length === 0) {
        const rawYear = entry.entryYear ?? null;
        const entryYear = rawYear != null && rawYear > 3000 ? null : rawYear;
        const bestId = findBestEntityMatch(entryNames, entities, entryYear, entryYear);
        if (bestId !== "") suggestions[entry.entryId] = bestId;
      }
    }
    // Merge so that any existing user selection takes precedence
    setSelectedEntities((prev) => ({ ...suggestions, ...prev }));
  }, [entries, entities]);

  // Aggregate entries by entryEntityIdVar and entryEntityId to combine entries that refer to the same entity
  // Create first and last date for each entity based on entryYear/entryMonth/entryDay to show date range of entries linked to the same entity
  const aggregatedEntries: EntriesAggregated[] = useMemo(() => entries?.Entries.reduce((acc, entry) => {
    const existing = acc.find(e => e.entryEntityIdVar === entry.entryEntityIdVar && e.entryEntityId === entry.entryEntityId);
    if (existing) {
      existing.uniqueObservationIds.push(entry.uniqueObservationId);
      // Add observation date if not already present
      if (!existing.observationDates.some(d => dateSortValue(d.year, d.month, d.day) === dateSortValue(entry.entryYear, entry.entryMonth, entry.entryDay))) {
        existing.observationDates.push({ year: entry.entryYear, month: entry.entryMonth, day: entry.entryDay });
        existing.observationDates.sort((a, b) => dateSortValue(a.year, a.month, a.day) - dateSortValue(b.year, b.month, b.day));
      }
      // Update first and last date based on entryYear/entryMonth/entryDay
      const entryDateValue = dateSortValue(entry.entryYear, entry.entryMonth, entry.entryDay);
      const existingFirstDateValue = dateSortValue(existing.yearFirst, existing.monthFirst, existing.dayFirst);
      const existingLastDateValue = dateSortValue(existing.yearLast, existing.monthLast, existing.dayLast);
      if (entryDateValue < existingFirstDateValue) {
        existing.yearFirst = entry.entryYear;
        existing.monthFirst = entry.entryMonth;
        existing.dayFirst = entry.entryDay;
      }
      if (entryDateValue > existingLastDateValue) {
        existing.yearLast = entry.entryYear;
        existing.monthLast = entry.entryMonth;
        existing.dayLast = entry.entryDay;
      }
      // Aggregate names (short, English, and original) for the same entity
      if (entry.entryEntityNameShort) {
        existing.namesShort = Array.from(new Set([...(existing.namesShort || []), entry.entryEntityNameShort]));
      }
      if (entry.entryEntityNameEnglish) {
        existing.namesEnglish = Array.from(new Set([...(existing.namesEnglish || []), entry.entryEntityNameEnglish]));
      }
      if (entry.entryEntityName) {
        existing.names = Array.from(new Set([...(existing.names || []), entry.entryEntityName]));
      }

      // Check if there are any linked PolPaL entities for the entry and add them to the aggregated entry
      entry.LinksEntryToEntity.forEach(link => {
        const existingLinked = existing.AlreadyLinked.find(l => l.polpalId === link.polpalId);
        const obsDate = { year: entry.entryYear, month: entry.entryMonth, day: entry.entryDay };
        if (!existingLinked) {
          existing.AlreadyLinked.push({
            polpalId: link.polpalId,
            partyfactsId: link.partyfactsId ?? null,
            entityType: link.entityType,
            entityNameShort: link.entityNameShort,
            entityNameEnglish: link.entityNameEnglish,
            entityName: link.entityName,
            wikipediaUrl: link.wikipediaUrl,
            wikidataId: link.wikidataId,
            startYear: link.startYear,
            startMonth: link.startMonth,
            startDay: link.startDay,
            endYear: link.endYear,
            endMonth: link.endMonth,
            endDay: link.endDay,
            comment: link.comment,
            linkComments: [{ comment: link.comment ?? null, observationDate: obsDate }],
            linkEntriesToEntityIds: [link.linkEntriesToEntityId],
            linkCreatorUserIds: [link.linkCreatorUserId],
            ValidationLinks: link.ValidationLinks.map(v => ({ ...v })),
          });
        } else {
          // Merge additional linkId and creator into existing entry
          existingLinked.linkEntriesToEntityIds.push(link.linkEntriesToEntityId);
          existingLinked.linkCreatorUserIds.push(link.linkCreatorUserId);
          existingLinked.linkComments.push({ comment: link.comment ?? null, observationDate: obsDate });
          // Merge ValidationLinks deduped by userId, keeping most recent updatedAt
          for (const vote of link.ValidationLinks) {
            const existing = existingLinked.ValidationLinks.find(v => v.userId === vote.userId);
            if (!existing) {
              existingLinked.ValidationLinks.push({ ...vote });
            } else if (vote.updatedAt > existing.updatedAt) {
              Object.assign(existing, vote);
            }
          }
        }
      });

    } else {
      acc.push({
        entryEntityIdVar: entry.entryEntityIdVar,
        entryEntityId: entry.entryEntityId,
        namesShort: entry.entryEntityNameShort ? [entry.entryEntityNameShort] : undefined,
        namesEnglish: entry.entryEntityNameEnglish ? [entry.entryEntityNameEnglish] : undefined,
        names: entry.entryEntityName ? [entry.entryEntityName] : undefined,
        uniqueObservationIds: [entry.uniqueObservationId],
        yearFirst: entry.entryYear,
        monthFirst: entry.entryMonth,
        dayFirst: entry.entryDay,
        yearLast: entry.entryYear,
        monthLast: entry.entryMonth,
        dayLast: entry.entryDay,
        observationDates: [{ year: entry.entryYear, month: entry.entryMonth, day: entry.entryDay }],
        AlreadyLinked: entry.LinksEntryToEntity.map(link => ({
          polpalId: link.polpalId,
          partyfactsId: link.partyfactsId ?? null,
          entityType: link.entityType,
          entityNameShort: link.entityNameShort,
          entityNameEnglish: link.entityNameEnglish,
          entityName: link.entityName,
          wikipediaUrl: link.wikipediaUrl,
          wikidataId: link.wikidataId,
          startYear: link.startYear,
          startMonth: link.startMonth,
          startDay: link.startDay,
          endYear: link.endYear,
          endMonth: link.endMonth,
          endDay: link.endDay,
          comment: link.comment,
          linkComments: [{ comment: link.comment ?? null, observationDate: { year: entry.entryYear, month: entry.entryMonth, day: entry.entryDay } }],
          linkEntriesToEntityIds: [link.linkEntriesToEntityId],
          linkCreatorUserIds: [link.linkCreatorUserId],
          ValidationLinks: link.ValidationLinks.map(v => ({ ...v })),
        }))
      });
    }
    return acc.sort((a, b) => {
      // Sort by first date, then by last date, then by entryEntityIdVar
      const aFirstDateValue = dateSortValue(a.yearFirst, a.monthFirst, a.dayFirst);
      const bFirstDateValue = dateSortValue(b.yearFirst, b.monthFirst, b.dayFirst);
      if (aFirstDateValue !== bFirstDateValue) return aFirstDateValue - bFirstDateValue;

      const aLastDateValue = dateSortValue(a.yearLast, a.monthLast, a.dayLast);
      const bLastDateValue = dateSortValue(b.yearLast, b.monthLast, b.dayLast);
      if (aLastDateValue !== bLastDateValue) return aLastDateValue - bLastDateValue;

      return a.entryEntityIdVar.localeCompare(b.entryEntityIdVar);
    });
  }, [] as EntriesAggregated[]) ?? [], [entries]);

  const filteredAggregatedEntries = useMemo(() => {
    return aggregatedEntries
      .filter((entry) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        const inNames = [
          ...(entry.namesShort ?? []),
          ...(entry.namesEnglish ?? []),
          ...(entry.names ?? []),
        ].some(n => n.toLowerCase().includes(q));
        const inEntityId =
          entry.entryEntityId.toLowerCase().includes(q) ||
          entry.entryEntityIdVar.toLowerCase().includes(q);
        const inLinked = entry.AlreadyLinked.some(l =>
          l.entityNameShort.toLowerCase().includes(q) ||
          l.entityNameEnglish.toLowerCase().includes(q) ||
          l.entityName.toLowerCase().includes(q) ||
          l.polpalId.toString().includes(q)
        );
        return inNames || inEntityId || inLinked;
      })
      .filter((entry) => {
        if (filterYearFrom !== "" && (entry.yearLast == null || entry.yearLast < filterYearFrom)) return false;
        if (filterYearTo !== "" && (entry.yearFirst == null || entry.yearFirst > filterYearTo)) return false;
        return true;
      })
      .filter((entry) => {
        if (filterEntityTypes.size === 0) return true;
        return entry.AlreadyLinked.some(l => filterEntityTypes.has(l.entityType));
      })
      .filter((entry) => {
        if (!showOnlyMultipleNames) return true;
        return Math.max(
          entry.namesShort?.length ?? 0,
          entry.namesEnglish?.length ?? 0,
          entry.names?.length ?? 0
        ) > 1;
      })
      .filter((entry) => {
        if (!showOnlyMultipleLinked) return true;
        return entry.AlreadyLinked.length > 1;
      })
      .filter((entry) => {
        if (!showOnlyUnlinked) return true;
        const rowEntries = entries?.Entries.filter(
          (e) => e.entryEntityIdVar === entry.entryEntityIdVar && e.entryEntityId === entry.entryEntityId
        ) ?? [];
        return rowEntries.some((e) => e.LinksEntryToEntity.length === 0);
      })
      .filter((entry) => {
        if (!showOnlyRejected) return true;
        return entry.AlreadyLinked.some(link =>
          link.linkEntriesToEntityIds.some(id =>
            (validationState[id] ?? []).some(v => v.verified === 'REJECTED')
          )
        );
      });
  }, [aggregatedEntries, searchQuery, filterYearFrom, filterYearTo, filterEntityTypes, showOnlyMultipleNames, showOnlyMultipleLinked, showOnlyUnlinked, showOnlyRejected, validationState, entries]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterYearFrom, filterYearTo, filterEntityTypes, showOnlyMultipleNames, showOnlyMultipleLinked, showOnlyUnlinked, showOnlyRejected]);

  async function handleLink(
    rowKey: string,
    uniqueObservationIds: string[],
    polpalId: number,
    data: FormDataLinkOptions,
  ) {
    setSubmittingLink((prev) => ({ ...prev, [rowKey]: true }));
    try {
      await Promise.all(
        uniqueObservationIds.map((uniqueObservationId) =>
          fetch('/api/links', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              uniqueObservationId,
              polpalId,
              startYear: data.startYear ?? null,
              startMonth: data.startMonth ?? null,
              startDay: data.startDay ?? null,
              endYear: data.endYear ?? null,
              endMonth: data.endMonth ?? null,
              endDay: data.endDay ?? null,
              comment: data.comment ?? null,
            }),
          }).then((res) => { if (!res.ok) throw new Error('Failed to create link'); })
        )
      );      // Update entries state so the linked entity appears immediately in the "Linked to..." column
      const linkedEntity = entities.find((e) => e.polpalId === polpalId);
      if (linkedEntity) {
        setEntries((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            Entries: prev.Entries.map((entry) => {
              if (!uniqueObservationIds.includes(entry.uniqueObservationId)) return entry;
              if (entry.LinksEntryToEntity.some((l) => l.polpalId === polpalId)) return entry;
              return {
                ...entry,
                LinksEntryToEntity: [
                  ...entry.LinksEntryToEntity,
                  {
                    linkEntriesToEntityId: -1,
                    polpalId: linkedEntity.polpalId,
                    partyfactsId: linkedEntity.partyfactsId ?? null,
                    linkCreatorUserId: auth?.userId != null ? Number(auth.userId) : null,
                    entityType: linkedEntity.entityType,
                    entityNameShort: linkedEntity.nameShort,
                    entityNameEnglish: linkedEntity.nameEnglish,
                    entityName: linkedEntity.name,
                    wikipediaUrl: linkedEntity.wikipediaUrl ?? null,
                    wikidataId: linkedEntity.wikidataId ?? null,
                    startYear: data.startYear ?? null,
                    startMonth: data.startMonth ?? null,
                    startDay: data.startDay ?? null,
                    endYear: data.endYear ?? null,
                    endMonth: data.endMonth ?? null,
                    endDay: data.endDay ?? null,
                    comment: data.comment ?? null,
                    ValidationLinks: [],
                  },
                ],
              };
            }),
          };
        });
      }
      // Clear dropdown selection for this row and its aggregated parent.
      // If linking from the aggregated row, also clear all sibling sub-rows.
      // If linking from a single sub-row, leave other siblings untouched.
      const keysToClear: Record<string, ""> = { [rowKey]: "" };
      if (entries) {
        const affected = entries.Entries.filter(e => uniqueObservationIds.includes(e.uniqueObservationId));
        const isSubRowLink = affected.some(e => e.entryId === rowKey);
        for (const e of affected) {
          const aggKey = `${e.entryEntityIdVar}-${e.entryEntityId}`;
          keysToClear[aggKey] = "";
          if (!isSubRowLink) {
            entries.Entries
              .filter(s => s.entryEntityIdVar === e.entryEntityIdVar && s.entryEntityId === e.entryEntityId)
              .forEach(s => { keysToClear[s.entryId] = ""; });
          }
        }
      }
      setSelectedEntities((prev) => ({ ...prev, ...keysToClear }));
    } finally {
      setSubmittingLink((prev) => ({ ...prev, [rowKey]: false }));
    }
  }

  async function handleUnlink(
    rowKey: string,
    uniqueObservationIds: string[],
    polpalId: number,
  ) {
    const unlinkKey = `${rowKey}-unlink-${polpalId}`;
    setDeletingLink((prev) => ({ ...prev, [unlinkKey]: true }));
    try {
      await fetch('/api/links/by-entries-polpal', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ uniqueObservationIds, polpalId }),
      }).then((res) => { if (!res.ok) throw new Error('Failed to delete link'); });
      setEntries((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          Entries: prev.Entries.map((entry) => {
            if (!uniqueObservationIds.includes(entry.uniqueObservationId)) return entry;
            return {
              ...entry,
              LinksEntryToEntity: entry.LinksEntryToEntity.filter((l) => l.polpalId !== polpalId),
            };
          }),
        };
      });
      // Remove cleared selections so the auto-suggest useEffect can re-populate them
      if (entries) {
        const isSubRowUnlink = entries.Entries.some(e => e.entryId === rowKey);
        setSelectedEntities((prev) => {
          const next = { ...prev };
          delete next[rowKey];
          const affected = entries.Entries.filter(e => uniqueObservationIds.includes(e.uniqueObservationId));
          for (const e of affected) {
            const aggKey = `${e.entryEntityIdVar}-${e.entryEntityId}`;
            delete next[aggKey];
            if (!isSubRowUnlink) {
              entries.Entries
                .filter(s => s.entryEntityIdVar === e.entryEntityIdVar && s.entryEntityId === e.entryEntityId)
                .forEach(s => { delete next[s.entryId]; });
            }
          }
          return next;
        });
      }
    } finally {
      setDeletingLink((prev) => ({ ...prev, [unlinkKey]: false }));
    }
  }

  // ---- Validation helpers ----

  function getAggregatedValidation(
    linkIds: number[],
    currentUserId: number | null | undefined,
    linkIdToObsDate?: Map<number, { year?: number | null; month?: number | null; day?: number | null }>
  ) {
    type VoteWithDate = ValidationVotePublic & { observationDate?: { year?: number | null; month?: number | null; day?: number | null } | null };
    // Collect per-user verdict sets across all link IDs for counting and MIXED detection.
    const userVerdicts = new Map<number | null, Set<'APPROVED' | 'REJECTED'>>();
    // Track most-recent vote per user (for sub-row comment dedup) and all votes for aggregated comment display.
    const latestVoteByUser = new Map<number | null, VoteWithDate>();
    const allVotesWithDate: VoteWithDate[] = [];
    for (const id of linkIds) {
      const obsDate = linkIdToObsDate?.get(id) ?? null;
      for (const vote of (validationState[id] ?? [])) {
        if (vote.verified === 'APPROVED' || vote.verified === 'REJECTED') {
          if (!userVerdicts.has(vote.userId)) userVerdicts.set(vote.userId, new Set());
          userVerdicts.get(vote.userId)!.add(vote.verified);
        }
        const voteWithDate: VoteWithDate = { ...vote, observationDate: obsDate };
        allVotesWithDate.push(voteWithDate);
        const existing = latestVoteByUser.get(vote.userId);
        if (!existing || vote.updatedAt > existing.updatedAt) {
          latestVoteByUser.set(vote.userId, voteWithDate);
        }
      }
    }
    // Count unique users per verdict direction.
    let approvedCount = 0;
    let rejectedCount = 0;
    for (const verdicts of userVerdicts.values()) {
      if (verdicts.has('APPROVED')) approvedCount++;
      if (verdicts.has('REJECTED')) rejectedCount++;
    }
    let currentUserVote: 'APPROVED' | 'REJECTED' | 'NONE' | 'MIXED' | null = null;
    if (currentUserId != null) {
      const verdicts = userVerdicts.get(currentUserId);
      if (!verdicts || verdicts.size === 0) currentUserVote = null;
      else if (verdicts.size > 1) currentUserVote = 'MIXED';
      else currentUserVote = [...verdicts][0] as 'APPROVED' | 'REJECTED';
    }
    // For aggregated rows (linkIdToObsDate provided): show ALL non-empty comments sorted by observation date.
    // For sub-rows (no linkIdToObsDate): one comment per unique user (most recent).
    const commentsWithVotes = linkIdToObsDate
      ? allVotesWithDate
        .filter(v => v.comment && v.comment.trim() !== '')
        .sort((a, b) => dateSortValue(a.observationDate?.year, a.observationDate?.month, a.observationDate?.day) - dateSortValue(b.observationDate?.year, b.observationDate?.month, b.observationDate?.day))
      : [...latestVoteByUser.values()].filter(v => v.comment && v.comment.trim() !== '');
    return { approvedCount, rejectedCount, currentUserVote, commentsWithVotes };
  }

  async function handleValidate(linkIds: number[], verdict: 'APPROVED' | 'REJECTED', comment: string | null, currentUserId: number) {
    // Filter out link IDs where the current user is the creator
    const toVote = linkIds.filter(id => {
      const link = entries?.Entries.flatMap(e => e.LinksEntryToEntity).find(l => l.linkEntriesToEntityId === id);
      return !link || link.linkCreatorUserId !== currentUserId;
    });
    if (toVote.length === 0) return;

    const now = new Date().toISOString();
    // Optimistic update
    setValidationState((prev) => {
      const next = { ...prev };
      for (const id of toVote) {
        const votes = [...(next[id] ?? [])];
        const idx = votes.findIndex(v => v.userId === currentUserId);
        const newVote: ValidationVotePublic = { userId: currentUserId, verified: verdict, comment, updatedAt: now };
        if (idx >= 0) votes[idx] = newVote; else votes.push(newVote);
        next[id] = votes;
      }
      return next;
    });
    toVote.forEach(id => setSubmittingValidation(prev => ({ ...prev, [id]: true })));

    const snapshots: Record<number, ValidationVotePublic[]> = {};
    for (const id of toVote) snapshots[id] = validationState[id] ?? [];

    try {
      await Promise.all(toVote.map(id =>
        fetch('/api/validate-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ linkId: id, validated: verdict, comment }),
        }).then(res => { if (!res.ok) throw new Error('Failed to save validation'); })
      ));
    } catch {
      // Revert on failure
      setValidationState(prev => {
        const next = { ...prev };
        for (const id of toVote) next[id] = snapshots[id];
        return next;
      });
    } finally {
      toVote.forEach(id => setSubmittingValidation(prev => ({ ...prev, [id]: false })));
    }
  }

  async function handleRemoveValidation(linkIds: number[], currentUserId: number) {
    const snapshots: Record<number, ValidationVotePublic[]> = {};
    for (const id of linkIds) snapshots[id] = validationState[id] ?? [];

    // Optimistic update
    setValidationState((prev) => {
      const next = { ...prev };
      for (const id of linkIds) {
        next[id] = (next[id] ?? []).filter(v => v.userId !== currentUserId);
      }
      return next;
    });
    linkIds.forEach(id => setSubmittingValidation(prev => ({ ...prev, [id]: true })));

    try {
      await Promise.all(linkIds.map(id =>
        fetch('/api/validate-links', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ linkId: id }),
        }).then(res => { if (!res.ok) throw new Error('Failed to remove validation'); })
      ));
    } catch {
      setValidationState(prev => {
        const next = { ...prev };
        for (const id of linkIds) next[id] = snapshots[id];
        return next;
      });
    } finally {
      linkIds.forEach(id => setSubmittingValidation(prev => ({ ...prev, [id]: false })));
    }
  }

  // Render loading state
  if (loadingData) {
    return <LoadingSpinner title="Loading entries data..." message={<>Fetching entries for <em>{versionKey} || {countrycodePolpal}</em></>} />;
  }

  // Render error state
  if (errorData) {
    return <ErrorState message={<>We encountered an issue while loading the entries for <em>{versionKey} || {countrycodePolpal}</em>.</>} error={errorData} backHref="/data/projects/" backLabel="Back to Data Projects" />;
  }

  // Render "version not found" state if no entries or entities were loaded (and not currently loading)
  if ((!entries || !entities && !loadingData) || (!isLoggedIn)) {
    return (
      <NotFoundState
        title="Entries Not Found"
        message={<>The entries for version <em>{versionKey}</em> could not be found or you don&apos;t have permission to view them.</>}
        backHref="/"
        backLabel="Back to Homepage"
      />
    );
  }

  // Render the main content of the page with breadcrumb navigation, header, dataset information, and entries table
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Backdrop to close dropdowns when clicking outside */}
      {openDropdown !== null && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
      )}
      {/* Aggregate validation confirmation dialog */}
      {aggregateConfirm && (
        <div aria-hidden="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div role="dialog" aria-modal="true" aria-labelledby="aggregate-confirm-title" className="bg-white rounded-lg shadow-xl border border-gray-200 p-6 max-w-sm w-full mx-4">
            <h3 id="aggregate-confirm-title" className="text-sm font-semibold text-gray-900 mb-2">
              {aggregateConfirm.action === 'remove' ? 'Confirm removal' : 'Confirm validation'}
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              {aggregateConfirm.action === 'remove'
                ? <>Are you sure you want to <strong>remove</strong> your validation for all <strong>{aggregateConfirm.count}</strong> {aggregateConfirm.count === 1 ? 'entry' : 'entries'} of this observation linked to <strong>{aggregateConfirm.entityName}</strong>?</>
                : <>Are you sure you want to validate all <strong>{aggregateConfirm.count}</strong> {aggregateConfirm.count === 1 ? 'entry' : 'entries'} of this observation to <strong>{aggregateConfirm.entityName}</strong>?</>
              }
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAggregateConfirm(null)}
                className="px-3 py-1.5 rounded border text-xs font-medium text-gray-800 bg-gray-100 border-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (aggregateConfirm.action === 'remove') {
                    handleRemoveValidation(aggregateConfirm.linkIds, aggregateConfirm.userId);
                  } else {
                    handleValidate(aggregateConfirm.linkIds, aggregateConfirm.verdict!, aggregateConfirm.comment ?? null, aggregateConfirm.userId);
                  }
                  setAggregateConfirm(null);
                }}
                className={`px-3 py-1.5 rounded border text-xs font-medium ${aggregateConfirm.action === 'remove'
                  ? 'text-gray-800 bg-gray-100 border-gray-700 hover:bg-gray-200'
                  : aggregateConfirm.verdict === 'APPROVED'
                    ? 'text-green-800 bg-green-100 border-green-700 hover:bg-green-200'
                    : 'text-red-800 bg-red-100 border-red-700 hover:bg-red-200'
                  }`}
              >
                {aggregateConfirm.action === 'remove' ? 'Remove all' : aggregateConfirm.verdict === 'APPROVED' ? 'Approve all' : 'Reject all'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <Breadcrumbs className="mb-6" items={[
        { label: "Home", href: "/" },
        { label: "Linking", href: "/data/linking" },
        { label: `${entries?.projectNameShort} - ${entries?.datasetNameShort} - ${entries?.version}`, href: `/data/linking/${versionKey}` },
        { label: entries?.countrycodePolpal ?? "unknown" },
      ]} />

      {/* Page Header */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              key={entries.countrycodePolpal}
              href={`/data/countries/${entries.countrycodePolpal}`}
              className="relative inline-flex items-center justify-center w-12 h-8 rounded overflow-hidden border border-gray-300 hover:border-amber-400 hover:shadow-sm"
              title={`${entries.countrycodePolpal}${entries.iso2c ? ` (${entries.iso2c})` : ''}`}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="absolute inset-0 flex items-center justify-center">
                <CountryFlag
                  iso2c={entries.iso2c}
                  countrycodePolpal={entries.countrycodePolpal}
                  countryname={entries.countryname}
                  size={64}
                />
              </span>
            </Link>
            <div>
              <h1 className="text-lg lg:text-3xl font-bold text-gray-900 leading-tight">
                {entries?.countryname}
              </h1>
              <p className="text-sm text-gray-500">{entries?.datasetNameShort} – {entries?.version}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-blue-600">{entries?.Entries?.length}</div>
              <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide mt-0.5">Entries</div>
            </div>
            <div className="w-px h-8 sm:h-10 bg-gray-200" />
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-purple-600">{new Set(entries?.Entries?.map(e => e.entryEntityIdVar)).size}</div>
              <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide mt-0.5">ID Variables</div>
            </div>
            <div className="w-px h-8 sm:h-10 bg-gray-200" />
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-green-600">{new Set(entries?.Entries?.flatMap(e => e.LinksEntryToEntity.map(l => l.polpalId))).size}</div>
              <div className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wide mt-0.5">PolPaL Entities</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-t pt-4 mt-6 mb-6">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Project</label>
            <p className="text-gray-900">
              {entries?.projectName ?? (
                <span className="italic text-gray-400">Unknown project</span>
              )}
              {entries?.projectNameShort && (
                <span className="text-gray-500 text-sm block">{entries?.projectNameShort}</span>
              )}
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Dataset</label>
            <p className="text-gray-900">
              {entries?.datasetName ?? (
                <span className="italic text-gray-400">Unknown dataset</span>
              )}
              {entries?.datasetNameShort && (
                <span className="text-gray-500 text-sm block">{entries?.datasetNameShort}</span>
              )}
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Version</label>
            <p className="text-gray-900">
              {entries?.version ?? (
                <span className="italic text-gray-400">Unknown version</span>
              )}
              {entries?.versionName && (
                <span className="text-gray-500 text-sm block">{entries?.versionName}</span>
              )}
            </p>
          </div>
        </div>
        <div>
          {/* Version Comment */}
          {(entries?.versionCommentVersion) && (
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">
                Comment (Version)
              </h3>
              <div className="text-gray-700 text-justify leading-relaxed [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_p]:mb-2 [&_strong]:font-semibold [&_em]:italic [&_a]:text-primary [&_a]:underline [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-semibold [&_code]:font-mono [&_code]:bg-gray-100 [&_code]:px-0.5 [&_code]:rounded [&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-2 [&_blockquote]:italic [&_blockquote]:text-gray-500">
                <ReactMarkdown>{entries.versionCommentVersion}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Entries Comment */}
          {(entries?.versionCommentEntries) && (
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">
                Comment (Entries)
              </h3>
              <div className="text-gray-700 text-justify leading-relaxed [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_p]:mb-2 [&_strong]:font-semibold [&_em]:italic [&_a]:text-primary [&_a]:underline [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-semibold [&_code]:font-mono [&_code]:bg-gray-100 [&_code]:px-0.5 [&_code]:rounded [&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-2 [&_blockquote]:italic [&_blockquote]:text-gray-500">
                <ReactMarkdown>{entries.versionCommentEntries}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* Hidden status for logged-in users */}
        {isLoggedIn && (
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wide">
              {entries?.versionIsHidden ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-600 border border-red-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />Hidden
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Public
                </span>
              )}
            </h3>
            <span className="text-sm text-gray-700">
              {entries?.versionIsHidden
                ? (entries.versionIsHiddenReason ?? "Version is hidden (no reason provided)")
                : "Version is public"}
            </span>
          </div>
        )}
      </div>

      {/* Variable Documentation */}
      <VariableDocumentation
        variables={variables.filter(v =>
          entries?.Entries?.some(e => e.entryEntityIdVar === v.entryEntityIdVar) ?? false
        )}
        onDelete={["ADMIN", "DATAMANAGER"].includes(auth?.role ?? "") ? handleDeleteVariable : undefined}
        isLoggedIn={!!auth?.userId}
        addHref={["ADMIN", "DATAMANAGER"].includes(auth?.role ?? "") ? `/manage/variables/create/${versionKey}` : undefined}
      />

      {/* Mobile warning */}
      <div className="lg:hidden flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 mt-0.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <p>The linking tool is not optimised for small screens. For the best experience, please use a wider screen.</p>
      </div>

      {/* Entries Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3 flex-1">
              <div className="bg-purple-100 rounded-xl p-3 shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-gray-800">Dataset Entries</h2>
                <p className="text-sm text-gray-600">
                  {entries?.datasetName} ({entries?.version})
                </p>
              </div>
            </div>
            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {isLoggedIn && (
                <Link
                  href={`/data/projects/${projectKey}/${datasetKey}/${versionKey}/${countrycodePolpal}`}
                  className="inline-flex items-center gap-1 h-9 px-3 rounded-full text-sm font-medium border border-gray-200 bg-primary text-white hover:bg-primary/90 transition-all"
                >
                  Close Linking
                </Link>
              )}
              <ButtonDownload
                onClick={downloadEntriesCsvStream}
                ariaLabel={`Download entries for ${versionKey} – ${countrycodePolpal}`}
                text="Download"
                disabled={(entries?.Entries?.length ?? 0) === 0}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-48">
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search names, entity ID, linked…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-7 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary w-full"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Filters toggle */}
            <button
              type="button"
              onClick={() => setShowFilters(v => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${showFilters || showOnlyMultipleNames || showOnlyMultipleLinked || showOnlyUnlinked || showOnlyRejected || filterYearFrom !== "" || filterYearTo !== "" || filterEntityTypes.size > 0
                ? "bg-primary/10 border-primary text-primary"
                : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              Filters
              {(showOnlyMultipleNames || showOnlyMultipleLinked || showOnlyUnlinked || showOnlyRejected || filterYearFrom !== "" || filterYearTo !== "" || filterEntityTypes.size > 0) && (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold">
                  {[showOnlyMultipleNames, showOnlyMultipleLinked, showOnlyUnlinked, showOnlyRejected, filterYearFrom !== "" || filterYearTo !== "", filterEntityTypes.size > 0].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Clear all filters */}
            {(showOnlyMultipleNames || showOnlyMultipleLinked || showOnlyUnlinked || showOnlyRejected || filterYearFrom !== "" || filterYearTo !== "" || filterEntityTypes.size > 0) && (
              <button
                type="button"
                onClick={() => {
                  setShowOnlyMultipleNames(false);
                  setShowOnlyMultipleLinked(false);
                  setShowOnlyUnlinked(false);
                  setShowOnlyRejected(false);
                  setFilterYearFrom("");
                  setFilterYearTo("");
                  setFilterEntityTypes(new Set());
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear
              </button>
            )}
          </div>

          {/* Collapsible filter panel */}
          {showFilters && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-wrap gap-3 grid grid-cols-1">
              {/* Year range */}
              {(() => {
                const hasDateInfo = aggregatedEntries.some(e => e.yearFirst != null || e.yearLast != null);
                return (
                  <div className={`flex flex-col gap-1.5 ${!hasDateInfo ? "opacity-40 pointer-events-none" : ""}`}>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Year range</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        placeholder="From"
                        disabled={!hasDateInfo}
                        value={filterYearFrom}
                        onChange={(e) => setFilterYearFrom(e.target.value ? Number(e.target.value) : "")}
                        className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 bg-white"
                      />
                      <span className="text-xs text-gray-400">–</span>
                      <input
                        type="number"
                        placeholder="To"
                        disabled={!hasDateInfo}
                        value={filterYearTo}
                        onChange={(e) => setFilterYearTo(e.target.value ? Number(e.target.value) : "")}
                        className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 bg-white"
                      />
                      {(filterYearFrom !== "" || filterYearTo !== "") && (
                        <button
                          type="button"
                          onClick={() => { setFilterYearFrom(""); setFilterYearTo(""); }}
                          className="text-gray-400 hover:text-gray-600"
                          aria-label="Clear year filter"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Entity type filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Entity Type</label>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(EntityTypesEnum) as EntityTypesEnum[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFilterEntityTypes((prev) => {
                        const next = new Set(prev);
                        if (next.has(type)) next.delete(type); else next.add(type);
                        return next;
                      })}
                      className={`px-1 py-1 rounded-full transition-opacity ${filterEntityTypes.has(type) ? "opacity-100 ring-2 ring-offset-1 ring-primary/90" : "opacity-60 hover:opacity-80"}`}
                    >
                      <EntityTypeBadge entityType={type} size="sm" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Show only toggles */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Show only</label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowOnlyMultipleNames((v) => !v)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${showOnlyMultipleNames
                      ? "bg-blue-50 border-blue-300 text-blue-700"
                      : "bg-white border-gray-300 text-gray-600 hover:bg-gray-100"
                      }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Multiple names
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOnlyMultipleLinked((v) => !v)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${showOnlyMultipleLinked
                      ? "bg-green-50 border-green-300 text-green-700"
                      : "bg-white border-gray-300 text-gray-600 hover:bg-gray-100"
                      }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Multiple linked
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOnlyUnlinked((v) => !v)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${showOnlyUnlinked
                      ? "bg-amber-50 border-amber-300 text-amber-700"
                      : "bg-white border-gray-300 text-gray-600 hover:bg-gray-100"
                      }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    Unlinked
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOnlyRejected((v) => !v)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${showOnlyRejected
                      ? "bg-red-50 border-red-300 text-red-700"
                      : "bg-white border-gray-300 text-gray-600 hover:bg-gray-100"
                      }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                    </svg>
                    Rejected
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Aggregated entries */}
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full min-w-[900px] table-fixed border-collapse text-xs">
            <colgroup>
              <col className="w-1/24" />
              <col className="w-7/24" />
              <col className="w-8/24" />
              <col className="w-8/24" />
            </colgroup>
            <thead className="bg-gray-100 sticky top-0 z-10 border-b">
              <tr>
                <th className="px-2 py-2"></th>
                <th className="px-4 py-2 text-left">External Entry</th>
                {isLoggedIn && <th className="px-4 py-2 text-left">Select</th>}
                <th className="px-4 py-2 text-left">PolPaL Entity</th>
              </tr>
            </thead>
            <tbody>
              {filteredAggregatedEntries
                .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                .map((entry) => {
                  const rowKey = `${entry.entryEntityIdVar}-${entry.entryEntityId}`;
                  const isExpanded = expandedRows.has(rowKey);
                  const rowEntries = entries?.Entries.filter(
                    (e) => e.entryEntityIdVar === entry.entryEntityIdVar && e.entryEntityId === entry.entryEntityId
                  ) ?? [];
                  const selectedId = selectedEntities[rowKey];
                  const selectedEntity = selectedId !== "" && selectedId !== undefined
                    ? entities.find((e) => e.polpalId === selectedId)
                    : undefined;
                  const isOpen = openDropdown === rowKey;
                  const hasUnlinkedEntries = rowEntries.some(e => e.LinksEntryToEntity.length === 0);
                  const hasMultipleNames = Math.max(
                    entry.namesShort?.length ?? 0,
                    entry.namesEnglish?.length ?? 0,
                    entry.names?.length ?? 0
                  ) > 1;
                  const hasMultipleLinkedEntities = entry.AlreadyLinked.length > 1;
                  const hasApproved = entry.AlreadyLinked.some(linked =>
                    linked.ValidationLinks.some(v => v.verified === 'APPROVED') ||
                    linked.linkEntriesToEntityIds.some(id =>
                      (validationState[id] ?? []).some(v => v.verified === 'APPROVED')
                    )
                  );
                  const hasRejected = entry.AlreadyLinked.some(linked =>
                    linked.ValidationLinks.some(v => v.verified === 'REJECTED') ||
                    linked.linkEntriesToEntityIds.some(id =>
                      (validationState[id] ?? []).some(v => v.verified === 'REJECTED')
                    )
                  );
                  return (
                    <Fragment key={rowKey}>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="px-2 py-2 align-top text-center text-lg text-gray-700">
                          {entry.observationDates.some(d => d.year) && (
                            <button
                              type="button"
                              className="text-gray-400 hover:text-gray-600"
                              onClick={() => setExpandedRows((prev) => {
                                const next = new Set(prev);
                                if (next.has(rowKey)) next.delete(rowKey); else next.add(rowKey);
                                return next;
                              })}
                              title={isExpanded ? "Collapse entries" : "Expand entries"}
                            >
                              {isExpanded ? "↓" : "→"}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-2 align-top">
                          <EntryCard entry={{
                            type: "aggregated",
                            entryEntityIdVar: entry.entryEntityIdVar,
                            entryEntityId: entry.entryEntityId,
                            namesShort: entry.namesShort,
                            namesEnglish: entry.namesEnglish,
                            names: entry.names,
                            yearFirst: entry.yearFirst,
                            monthFirst: entry.monthFirst,
                            dayFirst: entry.dayFirst,
                            yearLast: entry.yearLast,
                            monthLast: entry.monthLast,
                            dayLast: entry.dayLast,
                            observationCount: entry.uniqueObservationIds.length,
                            hasMultipleNames,
                            hasMultipleLinked: hasMultipleLinkedEntities,
                            hasUnlinked: hasUnlinkedEntries,
                            hasApproved,
                            hasRejected,
                            firstEntryId: entry.observationDates.every(d => !d.year) ? (rowEntries[0]?.entryId ?? null) : null,
                          }} />
                        </td>
                        {isLoggedIn && (
                          <td className="px-4 py-2 align-top">
                            <div className="relative">
                              <button
                                type="button"
                                className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white text-left focus:outline-none focus:ring-1 focus:ring-primary flex justify-between items-center gap-1"
                                onClick={() => {
                                  if (isOpen) {
                                    setOpenDropdown(null);
                                  } else {
                                    setOpenDropdown(rowKey);
                                    setDropdownSearch("");
                                  }
                                }}
                              >
                                <span className="truncate">
                                  {selectedEntity
                                    ? (selectedEntity.nameShort || selectedEntity.nameEnglish || selectedEntity.name)
                                    : "— Select entity —"}
                                </span>
                                <span className="text-gray-400">{isOpen ? "▲" : "▼"}</span>
                              </button>
                              {selectedEntity && !isOpen && (
                                <div className="mt-1">
                                  <EntityCard
                                    entity={selectedEntity}
                                    onLink={(data) => handleLink(rowKey, entry.uniqueObservationIds, selectedEntity.polpalId, data)}
                                    submitting={submittingLink[rowKey]}
                                    observationDates={entry.observationDates}
                                    showLogo={false}
                                    isLoggedIn={isLoggedIn}
                                  />
                                </div>
                              )}
                              {isOpen && (
                                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                                  <div className="p-2 border-b sticky top-0 bg-white">
                                    <input
                                      type="text"
                                      autoFocus
                                      placeholder="Search entities…"
                                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                      value={dropdownSearch}
                                      onChange={(e) => setDropdownSearch(e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                  <div
                                    className="px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 cursor-pointer border-b"
                                    onClick={() => {
                                      setSelectedEntities((prev) => ({ ...prev, [rowKey]: "" }));
                                      setOpenDropdown(null);
                                    }}
                                  >
                                    — Select entity —
                                  </div>
                                  {entities
                                    .filter((entity) => {
                                      const q = dropdownSearch.toLowerCase();
                                      return (
                                        !q ||
                                        entity.polpalId.toString().includes(q) ||
                                        entity.nameShort?.toLowerCase().includes(q) ||
                                        entity.nameEnglish?.toLowerCase().includes(q) ||
                                        entity.name?.toLowerCase().includes(q) ||
                                        entity.EntityNames.some((en) =>
                                          en.nameShort.toLowerCase().includes(q) ||
                                          en.name.toLowerCase().includes(q)
                                        )
                                      );
                                    })
                                    .map((entity) => (
                                      <div
                                        key={entity.polpalId}
                                        className={`cursor-pointer hover:bg-purple-50 border-b last:border-b-0 ${selectedId === entity.polpalId ? "bg-purple-50" : ""
                                          }`}
                                        onClick={() => {
                                          setSelectedEntities((prev) => ({ ...prev, [rowKey]: entity.polpalId }));
                                          setOpenDropdown(null);
                                        }}
                                      >
                                        <EntityCard entity={entity} isLoggedIn={isLoggedIn} />
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          </td>
                        )}
                        <td className="px-4 py-2 align-top">
                          {entry.AlreadyLinked.length === 0 ? (
                            <div className="inline-flex gap-1">
                              {hasUnlinkedEntries && (
                                <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 text-xs mb-1">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                  </svg>
                                  No entries linked
                                </span>
                              )}
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-col gap-2">
                                {entry.AlreadyLinked.map((linked) => {
                                  const unlinkKey = `${rowKey}-unlink-${linked.polpalId}`;
                                  const linkedObsDates = rowEntries
                                    .filter(e => e.LinksEntryToEntity.some(l => l.polpalId === linked.polpalId))
                                    .map(e => ({ year: e.entryYear, month: e.entryMonth, day: e.entryDay }));
                                  const currentUserIdNum = auth?.userId != null ? Number(auth.userId) : null;
                                  const anyCreatedByMe = currentUserIdNum != null && linked.linkCreatorUserIds.some(id => id === currentUserIdNum);
                                  const alreadyValidatedAny = currentUserIdNum != null && linked.linkEntriesToEntityIds.some(id =>
                                    (validationState[id] ?? []).some(v => v.userId === currentUserIdNum && (v.verified === 'APPROVED' || v.verified === 'REJECTED'))
                                  );
                                  const allEntriesLinked = rowEntries.every(e => e.LinksEntryToEntity.length > 0);
                                  // Allow remove/re-vote when ALL entries have the same verdict from this user
                                  const allValidatedSameWay = currentUserIdNum != null &&
                                    linked.linkEntriesToEntityIds.length > 0 &&
                                    linked.linkEntriesToEntityIds.every(id =>
                                      (validationState[id] ?? []).some(v => v.userId === currentUserIdNum && (v.verified === 'APPROVED' || v.verified === 'REJECTED'))
                                    ) &&
                                    new Set(linked.linkEntriesToEntityIds.map(id =>
                                      (validationState[id] ?? []).find(v => v.userId === currentUserIdNum)?.verified
                                    )).size === 1;
                                  const blockAggregatedValidation = anyCreatedByMe || (!allValidatedSameWay && alreadyValidatedAny) || !allEntriesLinked;
                                  const aggregatedBlockMessage = !allEntriesLinked ? 'Not all entries linked' : anyCreatedByMe ? 'You linked (parts of) this entry' : 'Already validated at least one entry';
                                  const linkIdToObsDate = new Map<number, { year?: number | null; month?: number | null; day?: number | null }>();
                                  for (const e of rowEntries) {
                                    for (const l of e.LinksEntryToEntity) {
                                      if (l.polpalId === linked.polpalId) {
                                        linkIdToObsDate.set(l.linkEntriesToEntityId, { year: e.entryYear, month: e.entryMonth, day: e.entryDay });
                                      }
                                    }
                                  }
                                  const { approvedCount, rejectedCount, currentUserVote, commentsWithVotes } = getAggregatedValidation(linked.linkEntriesToEntityIds, currentUserIdNum, linkIdToObsDate);
                                  const isSubmitting = linked.linkEntriesToEntityIds.some(id => submittingValidation[id]);
                                  return (
                                    <EntityCard
                                      key={linked.polpalId}
                                      entity={{
                                        polpalId: linked.polpalId,
                                        partyfactsId: linked.partyfactsId,
                                        entityType: linked.entityType,
                                        nameShort: linked.entityNameShort,
                                        nameEnglish: linked.entityNameEnglish,
                                        name: linked.entityName,
                                        wikipediaUrl: linked.wikipediaUrl,
                                        wikidataId: linked.wikidataId,
                                        EntityNames: entities.find(e => e.polpalId === linked.polpalId)?.EntityNames ?? [],
                                        appearanceFirst: entities.find(e => e.polpalId === linked.polpalId)?.appearanceFirst ?? null,
                                        appearanceLast: entities.find(e => e.polpalId === linked.polpalId)?.appearanceLast ?? null,
                                      }}
                                      observationDates={linkedObsDates}
                                      linkStart={{ year: linked.startYear, month: linked.startMonth, day: linked.startDay }}
                                      linkEnd={{ year: linked.endYear, month: linked.endMonth, day: linked.endDay }}
                                      linkComments={linked.linkComments}
                                      onUnlink={() => handleUnlink(rowKey, entry.uniqueObservationIds, linked.polpalId)}
                                      deleting={deletingLink[unlinkKey]}
                                      showLogo
                                      isLoggedIn={isLoggedIn}
                                      validation={isLoggedIn ? {
                                        isCreator: blockAggregatedValidation,
                                        creatorMessage: blockAggregatedValidation ? aggregatedBlockMessage : undefined,
                                        approvedCount,
                                        rejectedCount,
                                        currentUserVote,
                                        commentsWithVotes,
                                        submitting: isSubmitting,
                                        currentUserId: currentUserIdNum,
                                        onVote: (verdict, comment) => {
                                          if (currentUserIdNum == null) return;
                                          if (linked.linkEntriesToEntityIds.length > 1) {
                                            setAggregateConfirm({
                                              action: 'vote',
                                              linkIds: linked.linkEntriesToEntityIds,
                                              verdict,
                                              comment,
                                              userId: currentUserIdNum,
                                              entityName: linked.entityNameShort || linked.entityNameEnglish || linked.entityName,
                                              count: linked.linkEntriesToEntityIds.length,
                                            });
                                          } else {
                                            handleValidate(linked.linkEntriesToEntityIds, verdict, comment, currentUserIdNum);
                                          }
                                        },
                                        onRemove: () => {
                                          if (currentUserIdNum == null) return;
                                          if (linked.linkEntriesToEntityIds.length > 1) {
                                            setAggregateConfirm({
                                              action: 'remove',
                                              linkIds: linked.linkEntriesToEntityIds,
                                              userId: currentUserIdNum,
                                              entityName: linked.entityNameShort || linked.entityNameEnglish || linked.entityName,
                                              count: linked.linkEntriesToEntityIds.length,
                                            });
                                          } else {
                                            handleRemoveValidation(linked.linkEntriesToEntityIds, currentUserIdNum);
                                          }
                                        },
                                        allowCommentEdit: !entry.observationDates.some(d => d.year),
                                      } : undefined}
                                    />
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                      {isExpanded && [...rowEntries].sort((a, b) => dateSortValue(a.entryYear, a.entryMonth, a.entryDay) - dateSortValue(b.entryYear, b.entryMonth, b.entryDay)).map((e) => {
                        const subRowKey = e.entryId;
                        const subSelectedId = selectedEntities[subRowKey];
                        const subSelectedEntity = subSelectedId !== "" && subSelectedId !== undefined
                          ? entities.find((ent) => ent.polpalId === subSelectedId)
                          : undefined;
                        const subIsOpen = openDropdown === subRowKey;
                        const subObsDates = [{ year: e.entryYear, month: e.entryMonth, day: e.entryDay }];
                        return (
                          <tr key={e.entryId} className="bg-gray-100 border-b text-gray-500">
                            <td className="px-2 py-2 align-top text-center"></td>
                            <td className="px-4 py-2 align-top">
                              <EntryCard entry={{
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
                                hasMultipleLinked: e.LinksEntryToEntity.length > 1,
                                hasApproved: e.LinksEntryToEntity.some(link => link.ValidationLinks.some(v => v.verified === 'APPROVED')),
                                hasRejected: e.LinksEntryToEntity.some(link => link.ValidationLinks.some(v => v.verified === 'REJECTED')),
                              }} />
                            </td>
                            {isLoggedIn && (
                              <td className="px-4 py-2 align-top">
                                <div className="relative">
                                  <button
                                    type="button"
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs bg-white text-left focus:outline-none focus:ring-1 focus:ring-primary flex justify-between items-center gap-1"
                                    onClick={() => {
                                      if (subIsOpen) {
                                        setOpenDropdown(null);
                                      } else {
                                        setOpenDropdown(subRowKey);
                                        setDropdownSearch("");
                                      }
                                    }}
                                  >
                                    <span className="truncate">
                                      {subSelectedEntity
                                        ? (subSelectedEntity.nameShort || subSelectedEntity.nameEnglish || subSelectedEntity.name)
                                        : "— Select entity —"}
                                    </span>
                                    <span className="text-gray-400">{subIsOpen ? "▲" : "▼"}</span>
                                  </button>
                                  {subSelectedEntity && !subIsOpen && (
                                    <div className="mt-1">
                                      <EntityCard
                                        entity={subSelectedEntity}
                                        onLink={(data) => handleLink(subRowKey, [e.uniqueObservationId], subSelectedEntity.polpalId, data)}
                                        submitting={submittingLink[subRowKey]}
                                        observationDates={subObsDates}
                                        showLogo={false}
                                        isLoggedIn={isLoggedIn}
                                      />
                                    </div>
                                  )}
                                  {subIsOpen && (
                                    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                                      <div className="p-2 border-b sticky top-0 bg-white">
                                        <input
                                          type="text"
                                          autoFocus
                                          placeholder="Search entities…"
                                          className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                          value={dropdownSearch}
                                          onChange={(evt) => setDropdownSearch(evt.target.value)}
                                          onClick={(evt) => evt.stopPropagation()}
                                        />
                                      </div>
                                      <div
                                        className="px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 cursor-pointer border-b"
                                        onClick={() => {
                                          setSelectedEntities((prev) => ({ ...prev, [subRowKey]: "" }));
                                          setOpenDropdown(null);
                                        }}
                                      >
                                        — Select entity —
                                      </div>
                                      {entities
                                        .filter((ent) => {
                                          const q = dropdownSearch.toLowerCase();
                                          return (
                                            !q ||
                                            ent.polpalId.toString().includes(q) ||
                                            ent.nameShort?.toLowerCase().includes(q) ||
                                            ent.nameEnglish?.toLowerCase().includes(q) ||
                                            ent.name?.toLowerCase().includes(q) ||
                                            ent.EntityNames.some((en) =>
                                              en.nameShort.toLowerCase().includes(q) ||
                                              en.name.toLowerCase().includes(q)
                                            )
                                          );
                                        })
                                        .map((ent) => (
                                          <div
                                            key={ent.polpalId}
                                            className={`cursor-pointer hover:bg-purple-50 border-b last:border-b-0 ${subSelectedId === ent.polpalId ? "bg-purple-50" : ""}`}
                                            onClick={() => {
                                              setSelectedEntities((prev) => ({ ...prev, [subRowKey]: ent.polpalId }));
                                              setOpenDropdown(null);
                                            }}
                                          >
                                            <EntityCard
                                              entity={ent}
                                              isLoggedIn={isLoggedIn}
                                              showLogo={false}
                                            />
                                          </div>
                                        ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            )}
                            <td className="px-4 py-2 align-top">
                              {e.LinksEntryToEntity.length === 0 ? (
                                <span className="text-gray-400 italic">None</span>
                              ) : (
                                <div className="flex flex-col gap-2">
                                  {e.LinksEntryToEntity.map((linked) => {
                                    const subUnlinkKey = `${subRowKey}-unlink-${linked.polpalId}`;
                                    const subUserIdNum = auth?.userId != null ? Number(auth.userId) : null;
                                    const isCreator = subUserIdNum != null && linked.linkCreatorUserId === subUserIdNum;
                                    const { approvedCount: subApprovedCount, rejectedCount: subRejectedCount, currentUserVote: subUserVote, commentsWithVotes: subComments } = getAggregatedValidation([linked.linkEntriesToEntityId], subUserIdNum);
                                    const isSubSubmitting = !!submittingValidation[linked.linkEntriesToEntityId];
                                    return (
                                      <EntityCard
                                        key={linked.polpalId}
                                        entity={{
                                          polpalId: linked.polpalId,
                                          partyfactsId: linked.partyfactsId,
                                          entityType: linked.entityType,
                                          nameShort: linked.entityNameShort,
                                          nameEnglish: linked.entityNameEnglish,
                                          name: linked.entityName,
                                          wikipediaUrl: linked.wikipediaUrl,
                                          wikidataId: linked.wikidataId,
                                          EntityNames: entities.find(e => e.polpalId === linked.polpalId)?.EntityNames ?? [],
                                          appearanceFirst: entities.find(e => e.polpalId === linked.polpalId)?.appearanceFirst ?? null,
                                          appearanceLast: entities.find(e => e.polpalId === linked.polpalId)?.appearanceLast ?? null,
                                        }}
                                        observationDates={subObsDates}
                                        linkStart={{ year: linked.startYear, month: linked.startMonth, day: linked.startDay }}
                                        linkEnd={{ year: linked.endYear, month: linked.endMonth, day: linked.endDay }}
                                        linkComments={linked.comment ? [{ comment: linked.comment, observationDate: subObsDates[0] }] : []}
                                        onUnlink={() => handleUnlink(subRowKey, [e.uniqueObservationId], linked.polpalId)}
                                        deleting={deletingLink[subUnlinkKey]}
                                        showLogo
                                        isLoggedIn={isLoggedIn}
                                        validation={isLoggedIn ? {
                                          isCreator,
                                          approvedCount: subApprovedCount,
                                          rejectedCount: subRejectedCount,
                                          currentUserVote: subUserVote,
                                          commentsWithVotes: subComments,
                                          submitting: isSubSubmitting,
                                          currentUserId: subUserIdNum,
                                          onVote: (verdict, comment) => subUserIdNum != null && handleValidate([linked.linkEntriesToEntityId], verdict, comment, subUserIdNum),
                                          onRemove: () => subUserIdNum != null && handleRemoveValidation([linked.linkEntriesToEntityId], subUserIdNum),
                                          allowCommentEdit: true,
                                        } : undefined}
                                      />
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredAggregatedEntries.length > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-4 px-1">
            <p className="text-xs text-gray-500">
              Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredAggregatedEntries.length)}–{Math.min(currentPage * PAGE_SIZE, filteredAggregatedEntries.length)} of {filteredAggregatedEntries.length} rows
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                className="px-2 py-1 rounded border text-xs disabled:opacity-40 hover:bg-gray-50"
              >«</button>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="px-2 py-1 rounded border text-xs disabled:opacity-40 hover:bg-gray-50"
              >‹</button>
              {Array.from({ length: Math.ceil(filteredAggregatedEntries.length / PAGE_SIZE) }, (_, i) => i + 1)
                .filter(p => Math.abs(p - currentPage) <= 2)
                .map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCurrentPage(p)}
                    className={`px-2 py-1 rounded border text-xs ${p === currentPage ? "bg-primary text-white border-primary" : "hover:bg-gray-50"
                      }`}
                  >
                    {p}
                  </button>
                ))}
              <button
                type="button"
                disabled={currentPage === Math.ceil(filteredAggregatedEntries.length / PAGE_SIZE)}
                onClick={() => setCurrentPage(p => p + 1)}
                className="px-2 py-1 rounded border text-xs disabled:opacity-40 hover:bg-gray-50"
              >›</button>
              <button
                type="button"
                disabled={currentPage === Math.ceil(filteredAggregatedEntries.length / PAGE_SIZE)}
                onClick={() => setCurrentPage(Math.ceil(filteredAggregatedEntries.length / PAGE_SIZE))}
                className="px-2 py-1 rounded border text-xs disabled:opacity-40 hover:bg-gray-50"
              >»</button>
            </div>
          </div>
        )}

      </div>
    </div >
  );
}
