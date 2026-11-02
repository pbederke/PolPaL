"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import CountryBreadcrumbLinks from "@/components/ui/CountryBreadcrumbLinks";
import { EntityTypesEnum, LanguageCodeEnum, RoleEnum } from "@/lib/shared/enums";
import { EntityCard, EntityCardEntity } from "@/components/ui/EntityCard";
import { CountryCard } from "@/components/ui/CountryCard";
import { NewReferenceFormRow, NewReferenceData } from "@/components/manage/NewReferenceFormRow";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import { AccessDenied } from "@/components/ui/AccessDenied";

interface Entity {
  polpalId: number;
  partyfactsId?: number | null;
  nameShort: string;
  nameEnglish: string;
  name: string;
  entityType: EntityTypesEnum;
  wikidataId?: string | null;
  wikipediaUrl?: string | null;
  EntityNames?: {
    entityNameId: number;
    nameShort: string;
    name: string;
    language: string;
    startYear?: number | null;
    startMonth?: number | null;
    startDay?: number | null;
    endYear?: number | null;
    endMonth?: number | null;
    endDay?: number | null;
  }[];
  EntitiesInCountries: {
    countrycodePolpal: string;
  }[];
}

interface Entities {
  polpalId: number;
  partyfactsId?: number | null;
  nameShort?: string;
  nameEnglish?: string;
  name?: string;
  entityType?: EntityTypesEnum;
  wikidataId?: string | null;
  wikipediaUrl?: string | null;
  EntityNames: {
    nameShort: string;
    name: string;
  }[];
}

interface Countries {
  countryname: string;
  countrycodePolpal: string;
  iso2c: string;
  region: string;
}

interface EntitiesInCountries {
  Entities: Entities;
  Countries: Countries;
}

interface ExistingRelationship {
  groupingMemberId: number;
  entityId: number;
  groupingId: number;
  startYear?: number | null;
  startMonth?: number | null;
  startDay?: number | null;
  endYear?: number | null;
  endMonth?: number | null;
  endDay?: number | null;
  comment?: string | null;
  Entities?: { polpalId: number; nameShort?: string | null; nameEnglish?: string | null; entityType?: string | null } | null;
  Groupings?: { polpalId: number; nameShort?: string | null; nameEnglish?: string | null; entityType?: string | null } | null;
}

interface GroupingMemberFormData {
  entityId: number;
  groupingId: number;
  startYear?: number | null;
  startMonth?: number | null;
  startDay?: number | null;
  endYear?: number | null;
  endMonth?: number | null;
  endDay?: number | null;
  comment?: string | null;
  references?: NewReferenceData[];
}

const GROUPING_MEMBER_REFERENCE_FIELDS: { value: string; label: string }[] = [];

// A blank reference row used to seed each newly selected membership
const emptyMembershipReference = (): NewReferenceData => ({
  referencedField: "",
  type: "Website",
  value: "",
  language: "en",
  accessedAt: new Date().toISOString().split("T")[0],
  comment: "",
});

// Types that can participate in grouping memberships
const ELIGIBLE_TYPES: EntityTypesEnum[] = [
  EntityTypesEnum.GROUPING,
  EntityTypesEnum.PARTY,
  EntityTypesEnum.UNASSIGNED,
];

// Types that can be members of a grouping (not the grouping itself)
const MEMBER_TYPES: EntityTypesEnum[] = [
  EntityTypesEnum.PARTY,
  EntityTypesEnum.UNASSIGNED,
];

/**
 * Unified component for creating grouping membership relationships.
 *
 * Mode is determined by the entity's type after loading:
 *   - GROUPING  → "addMember":      current entity is the grouping; user picks PARTY/UNASSIGNED members
 *   - PARTY / UNASSIGNED → "joinGrouping": current entity is the member; user picks a GROUPING to join
 *   - anything else → error card
 */
export default function CreateGroupingRelationshipClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const polpalIdParam = searchParams.get("polpalId");
  const polpalId = polpalIdParam ? Number(polpalIdParam) : null;

  const [allEntitiesByCountry, setAllEntitiesByCountry] = useState<
    Record<string, { entities: Entities[]; country: Countries }>
  >({});
  const [entityCountries, setEntityCountries] = useState<string[]>([]);
  const [entity, setEntity] = useState<Entity | null>(null);
  const [membershipForms, setMembershipForms] = useState<GroupingMemberFormData[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("");
  const [countrySearch, setCountrySearch] = useState<string>("");
  const [existingRelationships, setExistingRelationships] = useState<ExistingRelationship[]>([]);
  const [countryCollapsed, setCountryCollapsed] = useState<Record<string, boolean>>({});
  const [assignedCountriesCollapsed, setAssignedCountriesCollapsed] = useState<boolean>(false);
  const [otherCountriesCollapsed, setOtherCountriesCollapsed] = useState<boolean>(true);
  const [localSearchTerms, setLocalSearchTerms] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [errorSubmit, setErrorSubmit] = useState<string | null>(null);

  // Authentication
  const { auth, loadingAuth } = useAuth();

  // Derived mode based on loaded entity type
  const isAddMember = entity?.entityType === EntityTypesEnum.GROUPING;

  // Get the "variable" ID from a form entry (the selected candidate's polpalId)
  const getSelectedId = (form: GroupingMemberFormData) =>
    isAddMember ? form.entityId : form.groupingId;

  useEffect(() => {
    if (!polpalId) return;
    if (loadingAuth) return;
    if (!([RoleEnum.ADMIN, RoleEnum.DATAMANAGER, RoleEnum.EDITOR, RoleEnum.CONTRIBUTOR] as string[]).includes(auth?.role ?? '')) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      try {
        // Step 1: fetch the current entity to determine mode
        const entityRes = await fetch(`/api/entities/${polpalId}`, {
          signal: controller.signal,
        });
        const entityData: Entity = await entityRes.json();
        setEntity(entityData);

        const countryCodes: string[] =
          entityData.EntitiesInCountries?.map(
            (eic: { countrycodePolpal: string }) => eic.countrycodePolpal
          ).filter(Boolean) ?? [];
        setEntityCountries(countryCodes);

        const initialCollapsed: Record<string, boolean> = {};
        countryCodes.forEach((code) => {
          initialCollapsed[code] = true;
        });
        setCountryCollapsed(initialCollapsed);

        // Ineligible types get no candidates list — the error card is shown instead
        if (!ELIGIBLE_TYPES.includes(entityData.entityType)) return;

        // Step 2: fetch candidates from the appropriate endpoint
        const addMember = entityData.entityType === EntityTypesEnum.GROUPING;
        const endpoint = addMember
          ? `/api/entities-in-countries/`
          : `/api/entities-in-countries/groupings`;

        const candidatesRes = await fetch(endpoint, {
          credentials: "include",
          signal: controller.signal,
        });
        if (!candidatesRes.ok) throw new Error("Failed to fetch entities");
        const candidatesData: EntitiesInCountries[] = await candidatesRes.json();

        const byCountry: Record<string, { entities: Entities[]; country: Countries }> = {};
        candidatesData.forEach((item) => {
          const code = item.Countries?.countrycodePolpal;
          if (code && item.Entities) {
            if (!byCountry[code]) {
              byCountry[code] = { entities: [], country: item.Countries };
            }
            byCountry[code].entities.push({ ...item.Entities });
          }
        });
        setAllEntitiesByCountry(byCountry);

        // Step 3: fetch existing relationships so we can mark already-linked entities
        const existingEndpoint = addMember
          ? `/api/groupings/members/${polpalId}`
          : `/api/groupings/membership/${polpalId}`;
        const existingRes = await fetch(existingEndpoint, {
          credentials: "include",
          signal: controller.signal,
        });
        if (existingRes.ok) {
          const existingData: ExistingRelationship[] = await existingRes.json();
          setExistingRelationships(existingData);
        }
      } catch (err: unknown) {
        if ((err as Error).name === "AbortError") return;
        console.error(err);
        setErrorSubmit("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [polpalId, loadingAuth, auth?.role]);

  const addReferenceToMembership = (selectedId: number) => {
    setMembershipForms((prev) =>
      prev.map((form) =>
        getSelectedId(form) === selectedId
          ? {
            ...form,
            references: [
              ...(form.references ?? []),
              emptyMembershipReference(),
            ],
          }
          : form
      )
    );
  };

  const removeReferenceFromMembership = (selectedId: number, refIdx: number) => {
    setMembershipForms((prev) =>
      prev.map((form) =>
        getSelectedId(form) === selectedId
          ? { ...form, references: (form.references ?? []).filter((_, i) => i !== refIdx) }
          : form
      )
    );
  };

  const handleMembershipReferenceChange = (
    selectedId: number,
    refIdx: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setMembershipForms((prev) =>
      prev.map((form) =>
        getSelectedId(form) === selectedId
          ? {
            ...form,
            references: (form.references ?? []).map((ref, i) =>
              i === refIdx ? { ...ref, [name]: value } : ref
            ),
          }
          : form
      )
    );
  };

  const toggleCountryCollapse = (countryCode: string) => {
    setCountryCollapsed((prev) => ({ ...prev, [countryCode]: !prev[countryCode] }));
  };

  const handleSubmit = async () => {
    if (!polpalId) return;

    const missingStartYear = membershipForms.filter((f) => f.startYear == null);
    if (missingStartYear.length > 0) {
      setErrorSubmit(`Start year is required for all selected entries. ${missingStartYear.length} entr${missingStartYear.length !== 1 ? "ies are" : "y is"} missing a start year.`);
      return;
    }

    const missingReference = membershipForms.filter(
      (f) => !(f.references ?? []).some((r) => r.value.trim() !== "")
    );
    if (missingReference.length > 0) {
      setErrorSubmit(`At least one reference with a value is required for all selected entries. ${missingReference.length} entr${missingReference.length !== 1 ? "ies are" : "y is"} missing a reference.`);
      return;
    }

    setLoadingSubmit(true);
    setErrorSubmit(null);

    try {
      for (const form of membershipForms) {
        const { references: _unusedRefs, ...body } = form;

        const res = await fetch(`/api/groupings/member`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errorText = await res.text();
          let displayError = errorText;
          try {
            const errorJson = JSON.parse(errorText);
            if (Array.isArray(errorJson)) {
              displayError = errorJson
                .map((e: { code?: string; path?: string[]; expected?: string; received?: string; message?: string }) => {
                  if (e.code === "invalid_type" && e.path) {
                    return `Field '${e.path.join(".")}' expected ${e.expected}, got ${e.received}.`;
                  }
                  return e.message ?? JSON.stringify(e);
                })
                .join("\n");
            }
          } catch { /* leave displayError as raw text */ }
          throw new Error(displayError);
        }

        const created = await res.json();
        const validRefs = (form.references ?? []).filter((r) => r.value.trim() !== "");
        if (validRefs.length > 0) {
          await Promise.all(
            validRefs.map((r) =>
              fetch(`/api/references`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  groupingMemberId: created.groupingMemberId,
                  referencedField: r.referencedField || null,
                  type: r.type,
                  value: r.value.trim(),
                  language: r.language || null,
                  accessedAt: r.accessedAt || null,
                  comment: r.comment || null,
                }),
              })
            )
          );
        }
      }

      router.push(`/data/entities/${polpalId}`);
    } catch (err: unknown) {
      console.error(err);
      setErrorSubmit((err as Error).message || "Failed to save");
    } finally {
      setLoadingSubmit(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading || loadingAuth) {
    return <LoadingSpinner title="Loading..." message="Fetching data. Please wait a moment." />;
  }

  if (!([RoleEnum.ADMIN, RoleEnum.DATAMANAGER, RoleEnum.EDITOR, RoleEnum.CONTRIBUTOR] as string[]).includes(auth?.role ?? '')) {
    return <AccessDenied message="ADMIN, DATAMANAGER, EDITOR or CONTRIBUTOR rights are required to create grouping relationships." />;
  }
  // -- Ineligible entity type error
  if (entity && !ELIGIBLE_TYPES.includes(entity.entityType)) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 font-bold text-sm">!</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-red-800 mb-1">Invalid Entity Type</h2>
              <p className="text-red-700">
                Only entities of type <strong>GROUPING</strong>, <strong>PARTY</strong>, and{" "}
                <strong>UNASSIGNED</strong> can participate in grouping memberships. This entity
                is of type <strong>{entity.entityType}</strong>.
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-red-200">
            <button
              onClick={() => router.push(`/data/entities/${entity.polpalId}`)}
              className="px-4 py-2 text-sm bg-red-100 text-red-700 border border-red-300 rounded-md hover:bg-red-200 transition-colors"
            >
              Back to Entity
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Mode-dependent labels (entity is guaranteed non-null past this point) ────
  const labels = isAddMember
    ? {
      h1: "Add Member(s)",
      subtitle: entity
        ? `Add members to ${entity.nameEnglish} (${entity.nameShort})`
        : `Entity ${polpalId}`,
      breadcrumb: "add member(s)",
      step1Title: "Select Members",
      step2Title: "Selected Members",
      existingTitle: "Members (already assigned)",
      noSelection: "Select entities to add as members",
      countLabel: (n: number) => `${n} member${n !== 1 ? "s" : ""} selected`,
      saveButton: "Save Members",
      removeTitle: "Remove member",
    }
    : {
      h1: "Add Membership(s)",
      subtitle: entity
        ? `Create memberships for ${entity.nameEnglish} (${entity.nameShort})`
        : `Entity ${polpalId}`,
      breadcrumb: "add membership(s)",
      step1Title: "Select Groupings",
      step2Title: "Selected Groupings",
      existingTitle: "Memberships (already assigned)",
      noSelection: "Select groupings to create memberships",
      countLabel: (n: number) => `${n} membership${n !== 1 ? "s" : ""} selected`,
      saveButton: "Save Memberships",
      removeTitle: "Remove grouping",
    };

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const fmtDate = (y?: number | null, m?: number | null, d?: number | null) =>
    y
      ? [String(y), m != null ? String(m).padStart(2, "0") : null, d != null ? String(d).padStart(2, "0") : null]
        .filter(Boolean)
        .join("-")
      : "–";

  const isEligibleCandidate = (p: Entities) => {
    if (p.polpalId === polpalId) return false;
    // In addMember mode only PARTY and UNASSIGNED may be selected
    if (isAddMember && !MEMBER_TYPES.includes(p.entityType as EntityTypesEnum)) return false;
    return true;
  };

  const toCardEntity = (p: Entities): EntityCardEntity => ({
    polpalId: p.polpalId,
    partyfactsId: p.partyfactsId ?? null,
    nameShort: p.nameShort ?? "",
    nameEnglish: p.nameEnglish ?? "",
    name: p.name ?? "",
    entityType: p.entityType as EntityTypesEnum,
    wikidataId: p.wikidataId ?? null,
    wikipediaUrl: p.wikipediaUrl ?? null,
    EntityNames: (p.EntityNames ?? []).map((n, i) => ({
      entityNameId: i,
      nameShort: n.nameShort,
      name: n.name,
      language: "en" as LanguageCodeEnum,
      startYear: null,
      startMonth: null,
      startDay: null,
      endYear: null,
      endMonth: null,
      endDay: null,
    })),
  });

  const renderEntityGrid = (
    countryCode: string,
    entities: Entities[],
    country: Countries,
    title: string,
    isPriorityCountry: boolean = false
  ) => {
    const localSearchTerm = localSearchTerms[countryCode] ?? "";
    const eligibleCount = entities.filter(isEligibleCandidate).length;
    if (eligibleCount === 0) return null;

    const q = localSearchTerm.toLowerCase();
    const filtered = entities
      .filter((p) => {
        if (!isEligibleCandidate(p)) return false;
        return (
          localSearchTerm === "" ||
          (p.nameEnglish?.toLowerCase().includes(q) ?? false) ||
          (p.nameShort?.toLowerCase().includes(q) ?? false) ||
          (p.name?.toLowerCase().includes(q) ?? false) ||
          (p.EntityNames?.some((n) => n.nameShort.toLowerCase().includes(q)) ?? false) ||
          (p.EntityNames?.some((n) => n.name.toLowerCase().includes(q)) ?? false) ||
          String(p.polpalId).includes(q)
        );
      })
      .sort((a, b) => (a.nameShort ?? "").localeCompare(b.nameShort ?? ""));

    const isCollapsed = isPriorityCountry && countryCollapsed[countryCode];

    const toggleSelection = (p: Entities) => {
      const selected = membershipForms.some((f) => getSelectedId(f) === p.polpalId);
      if (selected) {
        setMembershipForms((prev) => prev.filter((f) => getSelectedId(f) !== p.polpalId));
      } else {
        const newForm: GroupingMemberFormData = isAddMember
          ? { entityId: p.polpalId, groupingId: polpalId!, startYear: null, startMonth: null, startDay: null, endYear: null, endMonth: null, endDay: null, comment: null, references: [emptyMembershipReference()] }
          : { entityId: polpalId!, groupingId: p.polpalId, startYear: null, startMonth: null, startDay: null, endYear: null, endMonth: null, endDay: null, comment: null, references: [emptyMembershipReference()] };
        setMembershipForms((prev) => [...prev, newForm]);
      }
    };

    return (
      <div key={countryCode} className="rounded-lg border border-gray-200 overflow-hidden">
        {/* Country header */}
        <div
          className={`flex items-center justify-between px-4 py-3 font-semibold text-sm ${isPriorityCountry
            ? "bg-primary/10 cursor-pointer hover:bg-primary/20 transition-colors"
            : "bg-gray-100"
            }`}
          onClick={isPriorityCountry ? () => toggleCountryCollapse(countryCode) : undefined}
        >
          <span>
            {title}
            <span className="ml-2 text-xs font-normal text-gray-500">({eligibleCount})</span>
          </span>
          {isPriorityCountry && (
            isCollapsed
              ? <ChevronDown className="w-4 h-4 text-blue-500" />
              : <ChevronUp className="w-4 h-4 text-blue-500" />
          )}
        </div>

        {!isCollapsed && (
          <>
            {/* Search */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <input
                type="text"
                placeholder={`Search in ${country.countryname}…`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                value={localSearchTerm}
                onChange={(e) =>
                  setLocalSearchTerms((prev) => ({ ...prev, [countryCode]: e.target.value }))
                }
              />
              {localSearchTerm && (
                <p className="text-xs text-gray-500 mt-1">
                  {filtered.length} of {eligibleCount} entities match
                </p>
              )}
            </div>

            {/* Entity card grid */}
            <div className="p-4 bg-gray-50 max-h-[40rem] overflow-y-auto">
              {filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
                  {filtered.map((p) => {
                    const selected = membershipForms.some((f) => getSelectedId(f) === p.polpalId);
                    return (
                      <div
                        key={p.polpalId}
                        onClick={() => toggleSelection(p)}
                        className={`relative cursor-pointer rounded-lg transition-all ${selected
                            ? "ring-2 ring-primary shadow-md"
                            : "hover:ring-1 hover:ring-gray-300 hover:shadow-sm"
                          }`}
                      >
                        <EntityCard entity={toCardEntity(p)} />
                        <div className={`absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold shadow pointer-events-none select-none ${selected ? "bg-primary text-white" : "bg-white/90 border border-gray-200 text-gray-500"
                          }`}>
                          {selected ? (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <circle cx="12" cy="12" r="9" />
                            </svg>
                          )}
                          {selected ? "Selected" : "Select"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-gray-500 italic py-8">
                  {localSearchTerm ? "No entities match your search" : "No entities available"}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  // ── Main render ──────────────────────────────────────────────────────────────

  const regions = [
    ...new Set(
      Object.values(allEntitiesByCountry).map(
        (item) => item.country.region || "no region defined"
      )
    ),
  ].sort();

  const filteredOtherCountries = Object.entries(allEntitiesByCountry)
    .filter(([code]) => !entityCountries.includes(code))
    .filter(([, data]) => {
      const matchesRegion = !selectedRegion || (data.country.region || "no region defined") === selectedRegion;
      const q = countrySearch.toLowerCase();
      const matchesSearch =
        !countrySearch ||
        data.country.countryname.toLowerCase().includes(q) ||
        data.country.countrycodePolpal.toLowerCase().includes(q) ||
        (data.country.iso2c?.toLowerCase().includes(q) ?? false);
      return matchesRegion && matchesSearch;
    })
    .sort(([, a], [, b]) => a.country.countryname.localeCompare(b.country.countryname));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Countries", href: "/data/countries" },
          { label: <CountryBreadcrumbLinks countries={entity?.EntitiesInCountries} /> },
          {
            label: entity ? `${entity.nameShort}` : "...",
            href: `/data/entities/${polpalId}`,
          },
          { label: labels.breadcrumb },
        ]}
      />

      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">{labels.h1}</h1>
            <p className="text-lg text-gray-600">{labels.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Entity Information Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="p-6">
          <div className="flex items-center gap-3 border-b border-gray-200 pb-2 mb-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shrink-0">
              1
            </span>
            <h3 className="text-lg font-semibold text-gray-900">Entity Information</h3>
          </div>
          {entity && (
            <EntityCard
              entity={{
                polpalId: entity.polpalId,
                partyfactsId: entity.partyfactsId ?? null,
                nameShort: entity.nameShort,
                nameEnglish: entity.nameEnglish,
                name: entity.name,
                entityType: entity.entityType as EntityTypesEnum,
                wikidataId: entity.wikidataId ?? null,
                wikipediaUrl: entity.wikipediaUrl ?? null,
                EntityNames: (entity.EntityNames ?? []).map((n) => ({
                  entityNameId: n.entityNameId,
                  nameShort: n.nameShort,
                  name: n.name,
                  language: n.language as LanguageCodeEnum,
                  startYear: n.startYear ?? null,
                  startMonth: n.startMonth ?? null,
                  startDay: n.startDay ?? null,
                  endYear: n.endYear ?? null,
                  endMonth: n.endMonth ?? null,
                  endDay: n.endDay ?? null,
                })),
              }}
            />
          )}

          {/* Existing changes */}
          {existingRelationships.length > 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{labels.existingTitle}</p>
              {existingRelationships.length > 0 && (
                <div className="space-y-1">
                  {existingRelationships.map((r) => {
                    const related = isAddMember ? r.Entities : r.Groupings;
                    if (!related) return null;
                    return (
                      <div key={r.groupingMemberId} className="bg-gray-50 border border-gray-200 rounded px-3 py-1.5">
                        <div className="grid grid-cols-[1fr_5rem_5rem] sm:grid-cols-[3rem_5rem_1fr_7rem_7rem_7rem] items-center gap-2 text-xs">
                          <span className="hidden sm:block font-medium text-gray-800 truncate">{related.polpalId}</span>
                          <span className="font-medium sm:font-normal text-gray-800 sm:text-gray-600 truncate">{related.nameShort}</span>
                          <span className="hidden sm:block text-gray-600 truncate">{related.nameEnglish}</span>
                          <span className="hidden sm:block text-gray-500 truncate">{related.entityType}</span>
                          <span className="text-gray-400 text-left tabular-nums">{fmtDate(r.startYear, r.startMonth, r.startDay)}</span>
                          <span className="text-gray-400 text-left tabular-nums">{fmtDate(r.endYear, r.endMonth, r.endDay)}</span>
                        </div>
                        {r.comment && (
                          <div className="text-gray-400 text-left tabular-nums text-xs py-1">{r.comment}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>


        {/* Step 1: Select candidates */}
        <div className="p-6">
          <div className="flex items-center gap-3 border-b border-gray-200 pb-2 mb-6">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shrink-0">
              2
            </span>
            <h3 className="text-lg font-semibold text-gray-900">{labels.step1Title}</h3>
          </div>
          <div className="space-y-6">
            {/* Priority countries (the entity's own countries) */}
            {entityCountries.length > 0 && (
              <div>
                <button
                  type="button"
                  className="w-full flex items-center justify-between text-base font-semibold text-gray-800 mb-4 hover:text-gray-600 transition-colors bg-gray-100 px-4 py-2 rounded-md"
                  onClick={() => setAssignedCountriesCollapsed((v) => !v)}
                >
                  <span>Assigned Countries</span>
                  {assignedCountriesCollapsed
                    ? <ChevronDown className="w-4 h-4 text-gray-500" />
                    : <ChevronUp className="w-4 h-4 text-gray-500" />}
                </button>
                {!assignedCountriesCollapsed && (
                  <div className="space-y-4">
                    {entityCountries.map((code) => {
                      const data = allEntitiesByCountry[code];
                      if (!data) return null;
                      return renderEntityGrid(code, data.entities, data.country, data.country.countryname, true);
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Country card picker + entity grid for other countries */}
            <div className="mt-8">
              {/* Collapsible header */}
              <button
                type="button"
                className="w-full flex items-center justify-between text-base font-semibold text-gray-800 mb-4 hover:text-gray-600 transition-colors bg-gray-100 px-4 py-2 rounded-md"
                onClick={() => setOtherCountriesCollapsed((v) => !v)}
              >
                <span>Other Countries</span>
                {otherCountriesCollapsed
                  ? <ChevronDown className="w-4 h-4 text-gray-500" />
                  : <ChevronUp className="w-4 h-4 text-gray-500" />}
              </button>

              {!otherCountriesCollapsed && (
                <>
                  {/* Search + region filter */}
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                          Search Country
                        </label>
                        <input
                          type="text"
                          placeholder="Country name or code…"
                          value={countrySearch}
                          onChange={(e) => { setCountrySearch(e.target.value); setSelectedCountryCode(""); }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                          Region
                        </label>
                        <select
                          value={selectedRegion}
                          onChange={(e) => { setSelectedRegion(e.target.value); setSelectedCountryCode(""); }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        >
                          <option value="">All regions</option>
                          {regions.map((region) => (
                            <option
                              key={region}
                              value={region}
                              style={region === "no region defined" ? { fontStyle: "italic" } : {}}
                            >
                              {region}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* CountryCard grid */}
                  <div className="rounded-lg border border-gray-200 bg-gray-50 max-h-80 overflow-y-auto p-4">
                    {filteredOtherCountries.some(([, data]) => data.entities.filter(isEligibleCandidate).length > 0) ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {filteredOtherCountries.map(([code, data]) => {
                          const eligibleCount = data.entities.filter(isEligibleCandidate).length;
                          if (eligibleCount === 0) return null;
                          const isSelected = selectedCountryCode === code;
                          return (
                            <div
                              key={code}
                              onClick={() => setSelectedCountryCode(isSelected ? "" : code)}
                              className={`relative cursor-pointer rounded-lg transition-all ${isSelected
                                  ? "ring-2 ring-primary shadow-md"
                                  : "hover:ring-1 hover:ring-gray-300 hover:shadow-sm"
                                }`}
                            >
                              <CountryCard country={data.country} />
                              <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-gray-500 bg-gray-100 shadow pointer-events-none select-none">
                                {eligibleCount} entit{eligibleCount !== 1 ? "ies" : "y"}
                              </div>
                              <div className={`absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold shadow pointer-events-none select-none ${isSelected ? "bg-primary text-white" : "bg-white/90 border border-gray-200 text-gray-500"
                                }`}>
                                {isSelected ? (
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <circle cx="12" cy="12" r="9" />
                                  </svg>
                                )}
                                {isSelected ? "Selected" : "Select"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 italic py-8">
                        {countrySearch || selectedRegion ? "No countries match your filters" : "No other countries available"}
                      </p>
                    )}
                  </div>

                  {/* Entity grid for selected country */}
                  {selectedCountryCode && allEntitiesByCountry[selectedCountryCode] && (
                    <div className="mt-4">
                      {renderEntityGrid(
                        selectedCountryCode,
                        allEntitiesByCountry[selectedCountryCode].entities,
                        allEntitiesByCountry[selectedCountryCode].country,
                        allEntitiesByCountry[selectedCountryCode].country.countryname,
                        false
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Step 3: Selected items with date / reference inputs */}
        {membershipForms.length > 0 && (
          <div className="p-6 border-gray-200">
            <div className="flex items-center gap-3 border-b border-gray-200 pb-2 mb-6">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shrink-0">
                3
              </span>
              <h3 className="text-lg font-semibold text-gray-900">{labels.step2Title}</h3>
              <span className="ml-auto text-sm text-primary font-medium bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                {membershipForms.length} selected
              </span>
            </div>
            <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2">
              {membershipForms.map((form) => {
                const selectedId = getSelectedId(form);
                let foundEntity: Entities | null = null;

                for (const [, data] of Object.entries(allEntitiesByCountry)) {
                  const candidate = data.entities.find((e) => e.polpalId === selectedId);
                  if (candidate) {
                    foundEntity = candidate;
                    break;
                  }
                }

                if (!foundEntity) return null;

                return (
                  <div key={selectedId} className="flex flex-col gap-3">
                    {form.startYear == null && (
                      <p className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5">
                        Start year is required — open the link dialog to set it.
                      </p>
                    )}
                    <EntityCard
                      entity={toCardEntity(foundEntity)}
                      hideLinkButton={true}
                      onLink={(data) => {
                        const idField = isAddMember ? "entityId" : "groupingId";
                        setMembershipForms((prev) =>
                          prev.map((f) =>
                            f[idField] === selectedId
                              ? {
                                ...f,
                                startYear: data.startYear ?? null,
                                startMonth: data.startMonth ?? null,
                                startDay: data.startDay ?? null,
                                endYear: data.endYear ?? null,
                                endMonth: data.endMonth ?? null,
                                endDay: data.endDay ?? null,
                                comment: data.comment ?? null,
                              }
                              : f
                          )
                        );
                      }}
                      isLoggedIn={true}
                    />
                    {/* References */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">References <span className="text-red-500">*</span></label>
                        <button
                          type="button"
                          onClick={() => addReferenceToMembership(selectedId)}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium text-primary bg-blue-50 border border-transparent rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                        >
                          + Add Reference
                        </button>
                      </div>
                      {(form.references ?? []).length === 0 ? (
                        <p className="text-xs text-red-500">At least one reference is required</p>
                      ) : (
                        <div className="space-y-2">
                          {(form.references ?? []).map((ref, refIdx) => (
                            <NewReferenceFormRow
                              key={refIdx}
                              index={refIdx}
                              data={ref}
                              fields={GROUPING_MEMBER_REFERENCE_FIELDS}
                              fieldDefaultLabel="Entire Relationship"
                              fieldLocked
                              onChange={(e) =>
                                handleMembershipReferenceChange(selectedId, refIdx, e)
                              }
                              onRemove={() => removeReferenceFromMembership(selectedId, refIdx)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {errorSubmit && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg aria-hidden="true" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{errorSubmit}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4">
            <div className="text-sm text-gray-600">
              {membershipForms.length > 0 ? (
                <span>{labels.countLabel(membershipForms.length)}</span>
              ) : (
                <span>{labels.noSelection}</span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => router.push(`/data/entities/${entity?.polpalId}`)}
                className="w-full sm:w-auto px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                disabled={loadingSubmit}
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={
                  loadingSubmit ||
                  membershipForms.length === 0 ||
                  !membershipForms.every((f) => (f.references ?? []).some((r) => r.value.trim() !== ""))
                }
                className="w-full sm:w-auto px-6 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingSubmit ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  labels.saveButton
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
