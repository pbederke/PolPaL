"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import SearchInput from "@/components/ui/SearchInput";

import { EntityTypesEnum } from "@/lib/shared/enums";
import { EntityTypeBadge } from "@/components/ui/EntityTypeBadge";
import { useRouter } from "next/navigation";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import CountryBreadcrumbLinks from "@/components/ui/CountryBreadcrumbLinks";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import NotFoundState from "@/components/ui/NotFoundState";
import { Loader2, GitBranch, TrendingUp, BookOpen, Network } from "lucide-react";
import { ButtonAdd, ButtonDelete, ButtonUpdate, ButtonWikidata, ButtonWikipedia, ButtonGlobe, ButtonPartyFacts } from "@/components/ui/Buttons";
import { LANGUAGE_NAME_MAP } from "@/lib/shared/mapping";
import { LinkifiedText } from "@/components/ui/LinkifiedText";
import { EntityNameCard } from "@/components/ui/EntityNameCard";
import { EntityChangeCard } from "@/components/ui/EntityChangeCard";
import { EntityMemberCard } from "@/components/ui/EntityMemberCard";
import type { CardReference } from "@/components/ui/CardReferences";
import { EntityDatasetCard, EntityProjectCardData } from "@/components/ui/EntityDatasetCard";
import { EntityDatasetFigure } from "@/components/ui/EntityDatasetFigure";
import { CountryCard, CountryCardCountry } from "@/components/ui/CountryCard";

/** Remove text duplicated by Commons (e.g. "Unknown author Unknown author" → "Unknown author"). */
const dedup = (s: string) => s.replace(/^(.+?) ?\1$/, '$1');

interface References {
  referenceId: number;
  referencedField: string | null;
  type: string;
  value: string;
  language: string | null;
  accessedAt: string | null;
  comment: string | null;
  createdAt: string;
}

interface Entities {
  isHidden: boolean;
  isHiddenReason: string | null;
  polpalId: number;
  partyfactsId: number | null;
  nameShort: string;
  nameEnglish: string;
  name: string | null;
  entityType: EntityTypesEnum;
  wikipediaUrl: string | null;
  wikidataId: string | null;
  comment: string | null;
  References: References[];
  EntitiesInCountries: {
    countrycodePolpal: string;
    countryname: string;
    iso2c?: string | null;
    region?: string | null;
    comment?: string | null;
    References: References[];
  }[];
  GroupingMemberships: {
    groupingMemberId: number;
    polpalId: number;
    nameEnglish: string;
    nameShort: string;
    name: string | null;
    entityType: EntityTypesEnum;
    startYear: number | null;
    startMonth: number | null;
    startDay: number | null;
    endYear: number | null;
    endMonth: number | null;
    endDay: number | null;
    comment: string | null;
    References: References[];
  }[];
  GroupingMembers: {
    groupingMemberId: number;
    polpalId: number;
    nameEnglish: string;
    nameShort: string;
    name: string | null;
    entityType: EntityTypesEnum;
    startYear: number | null;
    startMonth: number | null;
    startDay: number | null;
    endYear: number | null;
    endMonth: number | null;
    endDay: number | null;
    comment: string | null;
    References: References[];
  }[];
  EntityNames: {
    entityNameId: number;
    nameShort: string;
    name: string;
    language: string;
    comment: string | null;
    startYear: number | null;
    startMonth: number | null;
    startDay: number | null;
    endYear: number | null;
    endMonth: number | null;
    endDay: number | null;
    References: References[];
  }[];
  EntityChangeOld: {
    entityChangeId: number;
    polpalId: number;
    nameShort: string;
    nameEnglish: string;
    name: string | null;
    countrycodePolpal: string[];
    changeYear: number;
    changeMonth: number | null;
    changeDay: number | null;
    changeType: string;
    comment: string | null;
    References: References[];
  }[];
  EntityChangeNew: {
    entityChangeId: number;
    polpalId: number;
    nameShort: string;
    nameEnglish: string;
    name: string | null;
    countrycodePolpal: string[];
    changeYear: number;
    changeMonth: number | null;
    changeDay: number | null;
    changeType: string;
    comment: string | null;
    References: References[];
  }[];
  EntryIntensity: {
    projectKey: string;
    projectNameShort: string;
    projectName: string;
    datasetKey: string;
    datasetNameShort: string;
    datasetName: string;
    entryYear: number | null;
  }[];
  EntryDatasetSummary: {
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
  }[];
};

export default function EntityPage() {

  // Initialize router for navigation
  const router = useRouter();

  // Get projectKey from URL params
  const params = useParams();
  const polpalId = params.PolPaLId as string;

  // Authentication context
  const { auth } = useAuth();

  // State for entity data
  const [entity, setEntity] = useState<Entities | null>(null);

  // State for loading and error handling 
  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState<string | null>(null);

  // State for logo fetching
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoAttribution, setLogoAttribution] = useState<{ artist: string; credit: string; license: string; filePageUrl: string; restrictions: string } | null>(null);
  const [loadingLogo, setLoadingLogo] = useState(false);
  const [errorLogo, setErrorLogo] = useState<string | null>(null);
  const [loadingColor, setLoadingColor] = useState(false);
  const [errorColor, setErrorColor] = useState<string | null>(null);
  const [logoFetchAttempted, setLogoFetchAttempted] = useState<string | null>(null);

  // State for color fetching
  const [colorHex, setColorHex] = useState<string | null>(null);
  const [colorFetchAttempted, setColorFetchAttempted] = useState<string | null>(null);

  // State for delete confirmation modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteComment, setDeleteComment] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Shared state for in-page sub-record deletions (entity names, changes, grouping members)
  const [inlineDeletePending, setInlineDeletePending] = useState<{
    type: 'entityChange' | 'entityName' | 'groupingMember';
    id: number;
    label: string;
  } | null>(null);
  const [inlineDeleteComment, setInlineDeleteComment] = useState("");
  const [inlineDeleteLoading, setInlineDeleteLoading] = useState(false);
  const [inlineDeleteError, setInlineDeleteError] = useState<string | null>(null);

  // References state
  const [referencesOpen, setReferencesOpen] = useState(false);
  // UI state
  const [searchDatasets, setSearchDatasets] = useState("");
  const [showAllCountries, setShowAllCountries] = useState(false);

  // Fetch entity data on component mount or when polpalId changes
  useEffect(() => {

    // Create AbortController to cancel requests
    const abortController = new AbortController();
    const { signal } = abortController;


    const fetchData = async () => {

      setLoadingData(true);
      setErrorData(null);

      try {
        const [entityRes] = await Promise.all([
          fetch(`/api/entities/${polpalId}`, { credentials: "include", signal }),
        ]);
        if (!entityRes.ok) throw new Error(await entityRes.text());

        const [entityData] = await Promise.all([
          entityRes.json(),
        ]);
        setEntity(entityData);
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

    // Cleanup function - runs when component unmounts
    return () => {
      abortController.abort(); // Cancel all ongoing requests
    };
  }, [polpalId]);

  // Fetch logo from Wikidata via server-side proxy (avoids CSP connect-src restriction)
  const fetchWikidataLogo = useCallback(async (wikidataId: string) => {
    setLoadingLogo(true);
    setErrorLogo(null);
    setLogoFetchAttempted(wikidataId);

    {/* 
    try {
      // Extract Q-number from full URL if needed
      const qNumber = wikidataId.includes('/')
        ? wikidataId.split('/').pop()
        : wikidataId;

      if (!qNumber || !/^Q\d+$/.test(qNumber)) {
        throw new Error(`Invalid Wikidata ID format: ${qNumber}`);
      }
      const response = await fetch(`/api/wikidata-logo?id=${qNumber}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error('Failed to fetch logo');

      const data = await response.json();
      if (data.logoUrl) {
        setLogoUrl(data.logoUrl);
      }
      if (data.attribution) {
        setLogoAttribution(data.attribution);
      }
    } catch (err: unknown) {
      console.error('Error fetching Wikidata logo:', err);
      setErrorLogo(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingLogo(false);
    }
    */}

    setLoadingLogo(false); // Temporarily disable logo fetching until we have figured out copyright/license issues
    setLogoUrl(null); // Temporarily disable logo fetching until we have figured out copyright/license issues
    setLogoAttribution(null); // Temporarily disable logo fetching until we have figured out copyright/license issues

  }, []);

  // Fetch logo when entity data is available
  useEffect(() => {
    if (entity?.wikidataId && !logoUrl && !loadingLogo && logoFetchAttempted !== entity.wikidataId) {
      fetchWikidataLogo(entity.wikidataId);
    }
  }, [entity?.wikidataId, logoUrl, loadingLogo, logoFetchAttempted, fetchWikidataLogo]);

  // Fetch color from Wikidata via server-side proxy
  const fetchWikidataColor = useCallback(async (wikidataId: string) => {
    setErrorColor(null);
    setLoadingColor(true);
    setColorFetchAttempted(wikidataId);
    try {
      const qNumber = wikidataId.includes('/') ? wikidataId.split('/').pop() : wikidataId;
      if (!qNumber || !/^Q\d+$/.test(qNumber)) return;
      const res = await fetch(`/api/wikidata-color?id=${qNumber}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.color) setColorHex(data.color);
    } catch (err: unknown) {
      console.error('Error fetching Wikidata color:', err);
      setErrorColor(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingColor(false);
    }
  }, []);

  // Fetch color when entity data is available
  useEffect(() => {
    if (entity?.wikidataId && !colorHex && colorFetchAttempted !== entity.wikidataId) {
      fetchWikidataColor(entity.wikidataId);
    }
  }, [entity?.wikidataId, colorHex, colorFetchAttempted, fetchWikidataColor]);


  // =====================
  // Handlers
  // =====================

  // Delete entity handler — opens the confirmation modal
  const handleDeleteEntity = (entityId: number) => {
    if (!entityId) return;
    setDeleteComment("");
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  // Performs the actual DELETE after the user confirms in the modal
  const handleDeleteEntityConfirm = async () => {
    if (!entity?.polpalId) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const comment = deleteComment.trim();
      const res = await fetch(`/api/entities/${entity.polpalId}`, {
        method: "DELETE",
        credentials: "include",
        ...(comment ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ comment }) } : {}),
      });
      if (!res.ok) throw new Error(await res.text());
      setDeleteModalOpen(false);
      router.push(`/data/countries/`);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleteLoading(false);
    }
  };

  // Helper function to get the earliest or latest year from entry data
  // Filters out null/invalid years and returns the min/max year as a string
  // Returns "-" if no valid years are found
  function getEntryYear(
    entries: { entryYear: number | null }[],
    type: "min" | "max"
  ): string {
    if (!entries || !Array.isArray(entries)) return "-";
    const years = entries
      .map((e) => e.entryYear)
      .filter(
        (year): year is number => typeof year === "number" && !isNaN(year) && year <= 2030
      );
    if (years.length === 0) return "-";
    return type === "min"
      ? Math.min(...years).toString()
      : Math.max(...years).toString();
  }

  function compareStartDates(
    a: { startYear: number | null; startMonth: number | null; startDay: number | null },
    b: { startYear: number | null; startMonth: number | null; startDay: number | null },
  ): number {
    const yDiff = (a.startYear ?? 0) - (b.startYear ?? 0);
    if (yDiff !== 0) return yDiff;
    const mDiff = (a.startMonth ?? 0) - (b.startMonth ?? 0);
    if (mDiff !== 0) return mDiff;
    return (a.startDay ?? 0) - (b.startDay ?? 0);
  }

  function compareChangeDates(
    a: { changeYear: number; changeMonth: number | null; changeDay: number | null },
    b: { changeYear: number; changeMonth: number | null; changeDay: number | null },
  ): number {
    const yDiff = a.changeYear - b.changeYear;
    if (yDiff !== 0) return yDiff;
    const mDiff = (a.changeMonth ?? 0) - (b.changeMonth ?? 0);
    if (mDiff !== 0) return mDiff;
    return (a.changeDay ?? 0) - (b.changeDay ?? 0);
  }

  const handleDeleteEntityChange = (entityChangeId: number) => {
    setInlineDeletePending({ type: 'entityChange', id: entityChangeId, label: `entity change #${entityChangeId}` });
    setInlineDeleteComment("");
    setInlineDeleteError(null);
  };

  const handleUpdateEntityChange = async (entityChangeId: number, data: { changeYear: number; changeMonth: number | null; changeDay: number | null; comment: string | null }) => {
    const res = await fetch(`/api/entity-changes/${entityChangeId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    setEntity((prev) => prev ? {
      ...prev,
      EntityChangeOld: prev.EntityChangeOld.map(c => c.entityChangeId === entityChangeId ? { ...c, ...data } : c),
      EntityChangeNew: prev.EntityChangeNew.map(c => c.entityChangeId === entityChangeId ? { ...c, ...data } : c),
    } : prev);
  };

  const handleDeleteEntityName = (entityNameId: number) => {
    setInlineDeletePending({ type: 'entityName', id: entityNameId, label: `entity name #${entityNameId}` });
    setInlineDeleteComment("");
    setInlineDeleteError(null);
  };

  const handleUpdateEntityName = async (entityNameId: number, data: { nameShort: string; name: string; language: string; comment: string | null; startYear: number | null; startMonth: number | null; startDay: number | null; endYear: number | null; endMonth: number | null; endDay: number | null }) => {
    const res = await fetch(`/api/entity-names/${entityNameId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    setEntity((prev) => prev ? {
      ...prev,
      EntityNames: prev.EntityNames.map(n => n.entityNameId === entityNameId ? { ...n, ...data } : n),
    } : prev);
  };

  const handleDeleteGroupingMember = (groupingMemberId: number) => {
    setInlineDeletePending({ type: 'groupingMember', id: groupingMemberId, label: `grouping member #${groupingMemberId}` });
    setInlineDeleteComment("");
    setInlineDeleteError(null);
  };

  const handleUpdateGroupingMember = async (groupingMemberId: number, data: { startYear: number | null; startMonth: number | null; startDay: number | null; endYear: number | null; endMonth: number | null; endDay: number | null; comment: string | null }) => {
    const res = await fetch(`/api/groupings/member/${groupingMemberId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    setEntity((prev) => prev ? {
      ...prev,
      GroupingMembers: prev.GroupingMembers.map(m => m.groupingMemberId === groupingMemberId ? { ...m, ...data } : m),
      GroupingMemberships: prev.GroupingMemberships.map(m => m.groupingMemberId === groupingMemberId ? { ...m, ...data } : m),
    } : prev);
  };

  const normalizeRefs = (refs: CardReference[]): References[] => refs.map((r) => ({
    referenceId: r.referenceId,
    referencedField: r.referencedField ?? null,
    type: r.type,
    value: r.value,
    language: r.language ?? null,
    accessedAt: r.accessedAt ?? null,
    comment: r.comment ?? null,
    createdAt: r.createdAt ?? new Date().toISOString(),
  }));

  const handleChangeEntityChangeReferences = (entityChangeId: number) => (refs: CardReference[]) => {
    setEntity((prev) => prev ? {
      ...prev,
      EntityChangeOld: prev.EntityChangeOld.map(c => c.entityChangeId === entityChangeId ? { ...c, References: normalizeRefs(refs) } : c),
      EntityChangeNew: prev.EntityChangeNew.map(c => c.entityChangeId === entityChangeId ? { ...c, References: normalizeRefs(refs) } : c),
    } : prev);
  };

  const handleChangeEntityNameReferences = (entityNameId: number) => (refs: CardReference[]) => {
    setEntity((prev) => prev ? {
      ...prev,
      EntityNames: prev.EntityNames.map(n => n.entityNameId === entityNameId ? { ...n, References: normalizeRefs(refs) } : n),
    } : prev);
  };

  const handleChangeGroupingMemberReferences = (groupingMemberId: number) => (refs: CardReference[]) => {
    setEntity((prev) => prev ? {
      ...prev,
      GroupingMembers: prev.GroupingMembers.map(m => m.groupingMemberId === groupingMemberId ? { ...m, References: normalizeRefs(refs) } : m),
      GroupingMemberships: prev.GroupingMemberships.map(m => m.groupingMemberId === groupingMemberId ? { ...m, References: normalizeRefs(refs) } : m),
    } : prev);
  };

  const handleConfirmInlineDelete = async () => {
    if (!inlineDeletePending) return;
    setInlineDeleteLoading(true);
    setInlineDeleteError(null);
    const { type, id } = inlineDeletePending;
    const comment = inlineDeleteComment.trim();
    const body = comment ? JSON.stringify({ comment }) : undefined;
    const headers = comment ? { 'Content-Type': 'application/json' } : undefined;
    try {
      let res: Response;
      if (type === 'entityChange') {
        res = await fetch(`/api/entity-changes/${id}`, { method: 'DELETE', credentials: 'include', ...(body ? { headers, body } : {}) });
        if (!res.ok) throw new Error(await res.text());
        setEntity((prev) => prev ? { ...prev,
          EntityChangeOld: prev.EntityChangeOld.filter(c => c.entityChangeId !== id),
          EntityChangeNew: prev.EntityChangeNew.filter(c => c.entityChangeId !== id),
        } : prev);
      } else if (type === 'entityName') {
        res = await fetch(`/api/entity-names/${id}`, { method: 'DELETE', credentials: 'include', ...(body ? { headers, body } : {}) });
        if (!res.ok) throw new Error(await res.text());
        setEntity((prev) => prev ? { ...prev, EntityNames: prev.EntityNames.filter(n => n.entityNameId !== id) } : prev);
      } else {
        res = await fetch(`/api/groupings/member/${id}`, { method: 'DELETE', credentials: 'include', ...(body ? { headers, body } : {}) });
        if (!res.ok) throw new Error(await res.text());
        setEntity((prev) => prev ? { ...prev,
          GroupingMembers: prev.GroupingMembers.filter(m => m.groupingMemberId !== id),
          GroupingMemberships: prev.GroupingMemberships.filter(m => m.groupingMemberId !== id),
        } : prev);
      }
      setInlineDeletePending(null);
    } catch (err: unknown) {
      setInlineDeleteError(err instanceof Error ? err.message : String(err));
    } finally {
      setInlineDeleteLoading(false);
    }
  };

  const filteredEntryDatasetSummary = useMemo(() => {
    if (!entity?.EntryDatasetSummary) return [];
    const lower = searchDatasets.toLowerCase();
    return entity.EntryDatasetSummary.filter(s =>
      s.projectNameShort.toLowerCase().includes(lower) ||
      s.projectName.toLowerCase().includes(lower) ||
      s.datasetNameShort.toLowerCase().includes(lower) ||
      s.datasetName.toLowerCase().includes(lower) ||
      s.versions.some(v => v.version.toLowerCase().includes(lower)) ||
      s.entryEntityIdVars.some(v => v.varName.toLowerCase().includes(lower) || v.values.some(val => val.toLowerCase().includes(lower)))
    );
  }, [entity, searchDatasets]);


  // Close inline delete modal on Escape
  useEffect(() => {
    if (!inlineDeletePending) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !inlineDeleteLoading) {
        setInlineDeletePending(null);
        setInlineDeleteError(null);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [inlineDeletePending, inlineDeleteLoading]);

  // Close delete modal on Escape
  useEffect(() => {
    if (!deleteModalOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleteLoading) {
        setDeleteModalOpen(false);
        setDeleteError(null);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [deleteModalOpen, deleteLoading]);

  // Render loading state
  if (loadingData || loadingLogo || loadingColor) {
    return <LoadingSpinner title="Loading entity..." message="Fetching entity data. Please wait a moment." />;
  }

  // Render error state
  if (errorData || errorLogo || errorColor) {
    return <ErrorState message="We encountered an issue while loading the entity." error={errorData || errorLogo || errorColor} backHref="/" />;
  }

  if (!entity && !loadingData && !loadingLogo && !loadingColor) {
    return (
      <NotFoundState
        title="Entity Not Found"
        message="The entity could not be found or you don't have permission to view it."
        showRetry
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Countries", href: "/data/countries" },
        { label: <CountryBreadcrumbLinks countries={entity?.EntitiesInCountries} showWorld={["UNKNOWN", "INDEPENDENT", "RESIDUAL", "OTHERS"].includes(entity?.entityType ?? "")} /> },
        { label: <>{entity?.nameEnglish} ({entity?.nameShort})</> },
      ]} />


      {/* Page Header */}
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${entity?.isHidden ? "border-red-700 border-l-6 border-r-6" : auth.loggedIn && entity?.comment ? "border-amber-300 border-l-6 border-r-6" : "border-gray-200"}`}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex-1  justify-center">
            <div className="flex items-end gap-4">
              {/* Logo Section */}
              <div className="flex-shrink-0">
                {loadingLogo && (
                  <div className="w-25 h-25 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  </div>
                )}
                {logoUrl && !loadingLogo && (
                  <div className="flex flex-col items-center gap-0.5">
                    {logoAttribution ? (
                      <a
                        href={logoAttribution.filePageUrl || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] text-gray-400 hover:text-gray-600 leading-tight max-w-[6rem] truncate block"
                        title={`${dedup(logoAttribution.artist) || dedup(logoAttribution.credit)} · ${logoAttribution.license}${logoAttribution.restrictions?.includes('trademarked') ? ' ™' : ''}`}
                      >
                        {dedup(logoAttribution.artist) || dedup(logoAttribution.credit)
                          ? `© ${dedup(logoAttribution.artist) || dedup(logoAttribution.credit)}`
                          : null}
                        {(dedup(logoAttribution.artist) || dedup(logoAttribution.credit)) && logoAttribution.license ? ' · ' : null}
                        {logoAttribution.license || null}
                        {logoAttribution.restrictions?.includes('trademarked') ? ' ™' : null}
                      </a>
                    ) : entity?.wikidataId ? (
                      <a
                        href={`https://www.wikidata.org/wiki/${entity.wikidataId.includes('/') ? entity.wikidataId.split('/').pop() : entity.wikidataId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] text-gray-400 hover:text-gray-600 leading-tight max-w-[6rem] truncate block"
                        title="Wikimedia Commons"
                      >
                        © Wikidata/Wikimedia Commons
                      </a>
                    ) : null}
                    <div className="w-25 h-25 bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                      <Image
                        src={logoUrl}
                        alt={`${entity?.nameShort} logo`}
                        width={100}
                        height={100}
                        className="w-full h-full object-contain"
                        unoptimized
                        onError={() => setLogoUrl(null)}
                      />
                    </div>
                  </div>
                )}
                {!logoUrl && !loadingLogo && colorHex && (
                  <div
                    className="w-3 h-20 rounded"
                    style={{ backgroundColor: `#${colorHex}` }}
                    title={`Color: #${colorHex}`}
                  />
                )}
              </div>

              {/* Name Section */}
              <div className="flex-1">
                {entity?.isHidden && (<div className="mt-2 mr-4 ml-2 inline-flex items-center gap-1 p-4 px-2 py-1 text-sm font-medium bg-red-50 text-red-700 rounded border border-red-700">
                  <GitBranch className="w-3 h-3" />
                  Hidden Entity
                </div>)}
                <EntityTypeBadge entityType={entity?.entityType} />
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1 px-2">
                  {entity?.nameShort} - {entity?.nameEnglish}
                </h1>
                <p className="text-lg text-gray-600 px-2 mt-1">
                  <span className="font-medium">{entity?.name || ""}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {entity?.partyfactsId && (
              <ButtonPartyFacts
                href={entity?.partyfactsId}
                ariaLabel={"Party Facts page of " + entity?.nameShort}
              />
            )}
            {entity?.wikipediaUrl && (
              <ButtonWikipedia
                href={entity?.wikipediaUrl}
                ariaLabel={"Wikipedia page of " + entity?.nameShort}
              />
            )}
            {entity?.wikidataId && (
              <ButtonWikidata
                href={entity?.wikidataId}
                ariaLabel={"Wikidata page of " + entity?.nameShort}
              />
            )}
            {["ADMIN", "DATAMANAGER", "EDITOR"].includes(auth.role ?? "") && (
              <ButtonGlobe
                text=""
                href={`/manage/entity-in-country/create?polpalId=${entity?.polpalId}`}
                ariaLabel={`Manage countries associations for ${entity?.nameShort}`}
              />
            )}
            {((["PARTY", "GROUPING", "UNASSIGNED"].includes(entity?.entityType ?? "")
              ? ["ADMIN", "DATAMANAGER", "EDITOR", "CONTRIBUTOR"]
              : ["ADMIN", "DATAMANAGER"]
            ).includes(auth.role ?? "")) && (
              <ButtonUpdate
                text=""
                href={`/manage/entity/update/${entity?.polpalId}`}
                ariaLabel="Update Entity"
              />
            )}
            {(["ADMIN", "DATAMANAGER", "EDITOR", "CONTRIBUTOR"].includes(auth.role ?? "") && (["PARTY", "GROUPING", "UNASSIGNED"].includes(entity?.entityType ?? "") && (entity?.partyfactsId == null))) && (
              <ButtonDelete
                text=""
                onClick={() => {
                  if (auth.role === "CONTRIBUTOR") {
                    router.push(`/user/tickets?title=${encodeURIComponent(`Request: Delete entity ${entity?.nameShort} (PolPaL ID: ${entity?.polpalId})`)}&description=${encodeURIComponent(`Entity: ${entity?.nameEnglish} (${entity?.nameShort})\nPolPaL ID: ${entity?.polpalId}\n\nReason for deletion request:\n`)}&url=${encodeURIComponent(`${window.location.origin}/data/entities/${entity?.polpalId}`)}`);
                  } else if (entity?.polpalId) {
                    handleDeleteEntity(entity.polpalId);
                  }
                }}
                ariaLabel={auth.role === "CONTRIBUTOR" ? "Request deletion of this entity" : "Delete Entity"}
              />
            )}
          </div>
        </div>

        <hr className="border-t border-gray-200 mb-6" />

        <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
          <div>
            <h2 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-widest">
              General Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                <span className="text-xs text-gray-400 uppercase tracking-wide block mb-1">PolPaL ID</span>
                <span className="text-sm text-gray-800 font-medium">{entity?.polpalId ?? "N/A"}</span>
              </div>
              <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                <span className="text-xs text-gray-400 uppercase tracking-wide block mb-1">First Dataset Appearance</span>
                <span className="text-sm text-gray-800 font-medium">
                  {getEntryYear((entity?.EntryDatasetSummary || []).map(s => ({ entryYear: s.firstAppearanceYear ?? null })), "min")}
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                <span className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Last Dataset Appearance</span>
                <span className="text-sm text-gray-800 font-medium">
                  {getEntryYear((entity?.EntryDatasetSummary || []).map(s => ({ entryYear: s.lastAppearanceYear ?? null })), "max")}
                </span>
              </div>
            </div>
            <div className="mt-4 bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
              <span className="text-xs text-gray-400 uppercase tracking-wide block mb-3">Assigned Countries</span>
              {entity?.EntitiesInCountries && entity.EntitiesInCountries.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
                    {(showAllCountries ? entity.EntitiesInCountries : entity.EntitiesInCountries.slice(0, 6)).map((c) => (
                      <CountryCard key={c.countrycodePolpal} country={c as CountryCardCountry} comment={c.comment} />
                    ))}
                  </div>
                  {entity.EntitiesInCountries.length > 6 && (
                    <button
                      type="button"
                      onClick={() => setShowAllCountries((v) => !v)}
                      className="mt-3 text-xs text-primary hover:underline font-medium"
                    >
                      {showAllCountries
                        ? "Show less"
                        : `Show ${entity.EntitiesInCountries.length - 6} more countr${entity.EntitiesInCountries.length - 6 !== 1 ? "ies" : "y"}`}
                    </button>
                  )}
                </>
              ) : (
                <span className="text-sm text-gray-800 font-medium flex flex-wrap items-center gap-0.5">
                  <CountryBreadcrumbLinks countries={entity?.EntitiesInCountries} showWorld={["UNKNOWN", "INDEPENDENT", "RESIDUAL", "OTHERS"].includes(entity?.entityType ?? "")} />
                </span>
              )}
            </div>
            {auth.loggedIn && entity?.comment && (
              <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
                <span className="text-sm text-amber-900 uppercase tracking-wide block mb-1">Comment</span>
                <span className="text-sm text-amber-700 whitespace-pre-wrap">{entity.comment}</span>
              </div>
            )}
            {entity?.isHidden && entity?.isHiddenReason && (
              <div className="mt-3 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                <span className="text-sm text-red-900 uppercase tracking-wide block mb-1">Hidden Reason</span>
                <span className="text-sm text-red-700 whitespace-pre-wrap">{entity.isHiddenReason}</span>
              </div>
            )}
          </div>
        </div>

        {/* Collapsible References */}
        <div className="mt-6 border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={() => setReferencesOpen((o) => !o)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <svg
              className={`w-4 h-4 transition-transform ${referencesOpen ? "rotate-90" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            References for entity type
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">{entity?.entityType}</span>
            <span className="ml-1 text-xs text-gray-400">({entity?.References?.length ?? 0})</span>
          </button>

          {referencesOpen && (
            <div className="mt-4">
              {!entity?.References?.length ? (
                <p className="text-sm text-gray-500 italic">No references recorded.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-3 py-2 text-left font-semibold text-gray-700">Type</th>
                        <th scope="col" className="px-3 py-2 text-left font-semibold text-gray-700">APA (7th ed.)</th>
                        <th scope="col" className="px-3 py-2 text-left font-semibold text-gray-700">Language</th>
                        <th scope="col" className="px-3 py-2 text-left font-semibold text-gray-700">Accessed At</th>
                        <th scope="col" className="px-3 py-2 text-left font-semibold text-gray-700">Comment</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {entity.References.map((ref) => (
                        <tr key={ref.referenceId} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-600">{ref.type}</td>
                          <td className="px-3 py-2 max-w-xs">
                            <LinkifiedText text={ref.value} />
                          </td>
                          <td className="px-3 py-2 text-gray-600">
                            {ref.language ? `${LANGUAGE_NAME_MAP[ref.language as keyof typeof LANGUAGE_NAME_MAP] ?? ref.language} (${ref.language})` : "—"}
                          </td>
                          <td className="px-3 py-2 text-gray-600">{ref.accessedAt ? new Date(ref.accessedAt).toLocaleDateString() : "—"}</td>
                          <td className="px-3 py-2 text-gray-600">{ref.comment ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dataset Appearance Intensity Plot */}
      {entity?.EntryIntensity && entity.EntryIntensity.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3 flex-1">
              <div className="bg-primary/10 rounded-lg p-3">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Dataset Appearance Over Time
                </h2>
                <p className="text-sm text-gray-600">
                  Appearance of entity in datasets across years (1880 onwards; pre-1880 grouped)
                </p>
              </div>
            </div>
          </div>
          <EntityDatasetFigure data={entity.EntryIntensity} />
        </div>
      )}

      {/* Additional Names */}
      {!["UNKNOWN", "RESIDUAL", "INDEPENDENT", "OTHERS"].includes(entity?.entityType ?? "") && ((entity?.EntityNames?.length ?? 0) > 0 || !!auth.role) && <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center gap-3 flex-1">
            <div className="bg-purple-100 rounded-lg p-3">
              <BookOpen className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Additional Names</h2>
              <p className="text-sm text-gray-600">
                {entity?.EntityNames?.length || 0} name{(entity?.EntityNames?.length || 0) !== 1 ? 's' : ''} recorded
              </p>
            </div>
          </div>
          {["ADMIN", "DATAMANAGER", "EDITOR", "CONTRIBUTOR"].includes(auth.role ?? "") && (
            <ButtonAdd
              text=""
              href={`/manage/entity-name/create?polpalId=${entity?.polpalId}`}
              ariaLabel={`Add Name to ${entity?.nameShort}`}
            />
          )}
        </div>

        {Array.isArray(entity?.EntityNames) && entity.EntityNames.length > 0 ? (
          <div className="grid grid-cols-1 gap-1">
            {[...entity.EntityNames]
              .sort((a, b) => compareStartDates(a, b))
              .map((name) => (
                <EntityNameCard
                  key={name.entityNameId}
                  entityName={name}
                  canDelete={["ADMIN", "DATAMANAGER", "EDITOR", "CONTRIBUTOR"].includes(auth.role ?? "")}
                  canEdit={["ADMIN", "DATAMANAGER", "EDITOR", "CONTRIBUTOR"].includes(auth.role ?? "")}
                  canEditRefs={["ADMIN", "DATAMANAGER", "EDITOR", "CONTRIBUTOR"].includes(auth.role ?? "")}
                  onDelete={handleDeleteEntityName}
                  onUpdate={handleUpdateEntityName}
                  onReferencesChange={handleChangeEntityNameReferences(name.entityNameId)}
                />
              ))}
          </div>
        ) : (
          null
        )}
      </div>}

      {/* Entity Changes */}
      {entity?.entityType !== "GROUPING" && !["UNKNOWN", "RESIDUAL", "INDEPENDENT", "OTHERS", "UNASSIGNED"].includes(entity?.entityType ?? "") && ((entity?.EntityChangeNew?.length ?? 0) > 0 || (entity?.EntityChangeOld?.length ?? 0) > 0 || !!auth.role) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex items-center gap-3 flex-1">
              <div className="bg-orange-100 rounded-lg p-3">
                <GitBranch className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Entity Changes</h2>
                <p className="text-sm text-gray-600">
                  Predecessors ({entity?.EntityChangeNew?.length || 0}) and successors ({entity?.EntityChangeOld?.length || 0}) of this entity
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {[
                "ADMIN",
                "DATAMANAGER",
                "EDITOR",
                "CONTRIBUTOR",
              ].includes(auth.role ?? "") && (
                  <ButtonAdd
                    text="Predecessor"
                    href={`/manage/entity-change/create?successorId=${entity?.polpalId}`}
                    ariaLabel="Add Predecessor"
                  />
                )}
              {[
                "ADMIN",
                "DATAMANAGER",
                "EDITOR",
                "CONTRIBUTOR",
              ].includes(auth.role ?? "") && (
                  <ButtonAdd
                    text="Successor"
                    href={`/manage/entity-change/create?predecessorId=${entity?.polpalId}`}
                    ariaLabel="Add Successor"
                  />
                )}
            </div>
          </div>

          {Array.isArray(entity?.EntityChangeNew) && entity.EntityChangeNew.length > 0 ? (
            <>
              <h3 className="text-base font-semibold text-gray-800 mt-4 mb-1">
                Predecessors
              </h3>
              <div className="grid grid-cols-1 gap-1">
                {[...entity.EntityChangeNew]
                  .sort((a, b) => compareChangeDates(a, b))
                  .map((change) => (
                  <EntityChangeCard
                    key={change.entityChangeId}
                    change={change}
                    canDelete={["ADMIN", "DATAMANAGER", "EDITOR", "CONTRIBUTOR"].includes(auth.role ?? "")}
                    canEdit={["ADMIN", "DATAMANAGER", "EDITOR", "CONTRIBUTOR"].includes(auth.role ?? "")}
                    canEditRefs={["ADMIN", "DATAMANAGER", "EDITOR", "CONTRIBUTOR"].includes(auth.role ?? "")}
                    onDelete={handleDeleteEntityChange}
                    onUpdate={handleUpdateEntityChange}
                    onReferencesChange={handleChangeEntityChangeReferences(change.entityChangeId)}
                  />
                ))}
              </div>
            </>
          ) : (
            null
          )}

          {Array.isArray(entity?.EntityChangeOld) && entity.EntityChangeOld.length > 0 ? (
            <>
              <h3 className="text-base font-semibold text-gray-800 mt-4 mb-1">
                Successors
              </h3>
              <div className="grid grid-cols-1 gap-1">
                {[...entity.EntityChangeOld]
                  .sort((a, b) => compareChangeDates(a, b))
                  .map((change) => (
                  <EntityChangeCard
                    key={change.entityChangeId}
                    change={change}
                    canDelete={["ADMIN", "DATAMANAGER", "EDITOR", "CONTRIBUTOR"].includes(auth.role ?? "")}
                    canEdit={["ADMIN", "DATAMANAGER", "EDITOR", "CONTRIBUTOR"].includes(auth.role ?? "")}
                    canEditRefs={["ADMIN", "DATAMANAGER", "EDITOR", "CONTRIBUTOR"].includes(auth.role ?? "")}
                    onDelete={handleDeleteEntityChange}
                    onUpdate={handleUpdateEntityChange}
                    onReferencesChange={handleChangeEntityChangeReferences(change.entityChangeId)}
                  />
                ))}
              </div>
            </>
          ) : (
            null
          )}
        </div>
      )}

      {/* Members Section */}
      {entity?.entityType === "GROUPING" && ((entity?.GroupingMembers?.length ?? 0) > 0 || !!auth.role) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex items-center gap-3 flex-1">
              <div className="bg-green-100 rounded-lg p-3">
                <Network className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Members</h2>
                <p className="text-sm text-gray-600">
                  {entity?.GroupingMembers?.length || 0} member{(entity?.GroupingMembers?.length || 0) !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            {["ADMIN", "DATAMANAGER", "EDITOR", "CONTRIBUTOR"].includes(
              auth.role ?? ""
            ) && (
                <ButtonAdd
                  text=""
                  href={`/manage/grouping-relationship/create?polpalId=${entity.polpalId}`}
                  ariaLabel="Add Member"
                />
              )}
          </div>

          {Array.isArray(entity?.GroupingMembers) && entity.GroupingMembers.length > 0 ? (
            <div className="grid grid-cols-1 gap-1">
              {[...entity.GroupingMembers]
                .sort((a, b) => {
                  const startDiff = compareStartDates(a, b);
                  if (startDiff !== 0) return startDiff;
                  return (a.endYear ?? 0) - (b.endYear ?? 0);
                })
                .map((member) => (
                  <EntityMemberCard
                    key={member.groupingMemberId}
                    member={member}
                    canDelete={["ADMIN", "DATAMANAGER", "EDITOR", "CONTRIBUTOR"].includes(auth.role ?? "")}
                    canEdit={["ADMIN", "DATAMANAGER", "EDITOR", "CONTRIBUTOR"].includes(auth.role ?? "")}
                    canEditRefs={["ADMIN", "DATAMANAGER", "EDITOR", "CONTRIBUTOR"].includes(auth.role ?? "")}
                    onDelete={handleDeleteGroupingMember}
                    onUpdate={handleUpdateGroupingMember}
                    onReferencesChange={handleChangeGroupingMemberReferences(member.groupingMemberId)}
                  />
                ))}
            </div>
          ) : (
            null
          )}
        </div>
      )}

      {/* Grouping Memberships Section */}
      {!["GROUPING", "UNKNOWN", "RESIDUAL", "INDEPENDENT", "OTHERS", "UNASSIGNED"].includes(entity?.entityType ?? "") && ((entity?.GroupingMemberships?.length ?? 0) > 0 || !!auth.role) && <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center gap-3 flex-1">
            <div className="bg-green-100 rounded-lg p-3">
              <Network className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Memberships</h2>
              <p className="text-sm text-gray-600">
                {entity?.GroupingMemberships?.length || 0} membership{(entity?.GroupingMemberships?.length || 0) !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          {["ADMIN", "DATAMANAGER", "EDITOR", "CONTRIBUTOR"].includes(
            auth.role ?? ""
          ) && (
              <ButtonAdd
                text=""
                href={`/manage/grouping-relationship/create?polpalId=${entity?.polpalId}`}
                ariaLabel={"Add Membership"}
              />
            )}
        </div>

        {Array.isArray(entity?.GroupingMemberships) && entity.GroupingMemberships.length > 0 ? (
          <div className="grid grid-cols-1 gap-1">
            {[...entity.GroupingMemberships]
              .sort((a, b) => {
                const startDiff = compareStartDates(a, b);
                if (startDiff !== 0) return startDiff;
                return (a.endYear ?? 0) - (b.endYear ?? 0);
              })
              .map((membership) => (
                <EntityMemberCard
                  key={membership.groupingMemberId}
                  member={membership}
                  canDelete={["ADMIN", "DATAMANAGER", "EDITOR", "CONTRIBUTOR"].includes(auth.role ?? "")}
                  canEdit={["ADMIN", "DATAMANAGER", "EDITOR", "CONTRIBUTOR"].includes(auth.role ?? "")}
                  canEditRefs={["ADMIN", "DATAMANAGER", "EDITOR", "CONTRIBUTOR"].includes(auth.role ?? "")}
                  onDelete={handleDeleteGroupingMember}
                  onUpdate={handleUpdateGroupingMember}
                  onReferencesChange={handleChangeGroupingMemberReferences(membership.groupingMemberId)}
                />
              ))}
          </div>
        ) : (
          null
        )}
      </div>}

      {/* Dataset Appearances Summary */}
      {entity?.EntryDatasetSummary && entity.EntryDatasetSummary.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex items-center gap-3 flex-1">
              <div className="bg-blue-100 rounded-lg p-3">
                <BookOpen className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Dataset Appearances Summary
                </h2>
                <p className="text-sm text-gray-600">
                  Appearance of entity across different datasets
                </p>
              </div>
            </div>
            <SearchInput value={searchDatasets} onChange={setSearchDatasets} placeholder="Search datasets..." />
          </div>

          {filteredEntryDatasetSummary.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {Object.values(
                [...filteredEntryDatasetSummary]
                  .sort((a, b) => {
                    const projectDiff = (a.projectNameShort || "").localeCompare(b.projectNameShort || "");
                    if (projectDiff !== 0) return projectDiff;
                    return (a.datasetNameShort || "").localeCompare(b.datasetNameShort || "");
                  })
                  .reduce<Record<string, EntityProjectCardData>>((acc, s) => {
                    if (!acc[s.projectKey]) {
                      acc[s.projectKey] = { projectKey: s.projectKey, projectName: s.projectName, projectNameShort: s.projectNameShort, datasets: [] };
                    }
                    acc[s.projectKey].datasets.push({
                      datasetKey: s.datasetKey,
                      datasetName: s.datasetName,
                      datasetNameShort: s.datasetNameShort,
                      firstAppearanceYear: s.firstAppearanceYear,
                      lastAppearanceYear: s.lastAppearanceYear,
                      versions: s.versions,
                      entryEntityIdVars: s.entryEntityIdVars,
                    });
                    return acc;
                  }, {})
              ).map((project) => (
                <EntityDatasetCard key={project.projectKey} project={project} polpalId={entity!.polpalId} />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500 italic text-sm">No dataset appearances found</div>
          )}
        </div>
      )}
      {/* Inline sub-record delete modal (entity names, changes, grouping members) */}
      {inlineDeletePending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div role="dialog" aria-modal="true" aria-labelledby="inline-delete-title"
            className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 space-y-4">
            <h2 id="inline-delete-title" className="text-lg font-semibold text-gray-900">
              Delete {inlineDeletePending.label}?
            </h2>
            <p className="text-sm text-gray-600">This action cannot be undone.</p>
            <div>
              <label htmlFor="inline-delete-comment" className="block text-sm font-medium text-gray-700 mb-1">
                Reason for deletion <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="inline-delete-comment"
                value={inlineDeleteComment}
                onChange={(e) => setInlineDeleteComment(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Add a note that will be saved in the changelog…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                disabled={inlineDeleteLoading}
              />
            </div>
            {inlineDeleteError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3" role="alert">{inlineDeleteError}</p>
            )}
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => { setInlineDeletePending(null); setInlineDeleteError(null); }} disabled={inlineDeleteLoading}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleConfirmInlineDelete} disabled={inlineDeleteLoading}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50 transition-colors">
                {inlineDeleteLoading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="entity-delete-title"
            className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 space-y-4"
          >
            <h2 id="entity-delete-title" className="text-lg font-semibold text-gray-900">
              Delete &ldquo;{entity?.nameShort}&rdquo;?
            </h2>
            <p className="text-sm text-gray-600">
              This will permanently delete <span className="font-medium">{entity?.nameEnglish}</span> (PolPaL ID {entity?.polpalId}). This action cannot be undone.
            </p>
            <div>
              <label htmlFor="entity-delete-comment" className="block text-sm font-medium text-gray-700 mb-1">
                Reason for deletion <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="entity-delete-comment"
                value={deleteComment}
                onChange={(e) => setDeleteComment(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Add a note that will be saved in the changelog…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                disabled={deleteLoading}
              />
            </div>
            {deleteError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3" role="alert">{deleteError}</p>
            )}
            <div className="flex gap-3 justify-end pt-1">
              <button
                onClick={() => { setDeleteModalOpen(false); setDeleteError(null); }}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEntityConfirm}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteLoading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
