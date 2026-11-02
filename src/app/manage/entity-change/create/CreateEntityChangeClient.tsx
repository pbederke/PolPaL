"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import CountryBreadcrumbLinks from "@/components/ui/CountryBreadcrumbLinks";
import { EntityCard, EntityCardEntity } from "@/components/ui/EntityCard";
import { CountryCard } from "@/components/ui/CountryCard";
import { EntityTypesEnum, EntityChangesEnum, LanguageCodeEnum, RoleEnum } from "@/lib/shared/enums";
import { NewReferenceFormRow, NewReferenceData } from "@/components/manage/NewReferenceFormRow";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import { AccessDenied } from "@/components/ui/AccessDenied";

interface EntityChange {
  entityChangeId: number;
  polpalId: number;
  partyfactsId?: number | null;
  nameShort: string;
  nameEnglish: string;
  changeYear: number;
  changeMonth: number | null;
  changeDay: number | null;
  changeType: string;
  comment: string | null;
}

interface Entity {
  polpalId: number;
  partyfactsId?: number | null;
  nameShort: string;
  nameEnglish: string;
  name: string;
  entityType: string;
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
    Countries: {
      countrycodePolpal: string;
      countryname: string;
      iso2c: string;
      region: string;
    };
  }[];
  EntityChangeOld: EntityChange[];
  EntityChangeNew: EntityChange[];
}

interface Countries {
  countrycodePolpal: string;
  countryname: string;
  iso2c: string;
  region: string;
}

interface Entities {
  polpalId: number;
  partyfactsId?: number | null;
  nameShort: string;
  nameEnglish: string;
  name: string;
  entityType: EntityTypesEnum;
  wikidataId?: string | null;
  wikipediaUrl?: string | null;
  EntityNames: {
    nameShort: string;
    name: string;
  }[];
  EntitiesInCountries: {
    Countries: Countries;
  }[];
}

interface EntityChangeFormData {
  entityId: number;
  changeType: EntityChangesEnum;
  changeYear: number;
  changeMonth?: number | null;
  changeDay?: number | null;
  comment?: string | null;
  references?: NewReferenceData[];
}

const ENTITY_CHANGE_REFERENCE_FIELDS: { value: string; label: string }[] = [];

export default function CreateEntityChangeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const predecessorId = searchParams.get("predecessorId");
  const successorId = searchParams.get("successorId");
  const polpalId = predecessorId || successorId;

  // Authentication
  const { auth, loadingAuth } = useAuth();

  const [loadingData, setLoadingData] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [errorSubmit, setErrorSubmit] = useState<string | null>(null);
  const [entities, setEntities] = useState<Entities[]>([]);
  const [entity, setEntity] = useState<Entity | null>(null);

  const [changeForms, setChangeForms] = useState<EntityChangeFormData[]>([]);

  // State for info card
  const [showInfo, setShowInfo] = useState(false);

  // Country/entity browser state
  const [allEntitiesByCountry, setAllEntitiesByCountry] = useState<
    Record<string, { entities: Entities[]; country: Countries }>
  >({});
  const [entityCountries, setEntityCountries] = useState<string[]>([]);
  const [countryCollapsed, setCountryCollapsed] = useState<Record<string, boolean>>({});
  const [assignedCountriesCollapsed, setAssignedCountriesCollapsed] = useState(false);
  const [otherCountriesCollapsed, setOtherCountriesCollapsed] = useState(true);
  const [selectedCountryCode, setSelectedCountryCode] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [localSearchTerms, setLocalSearchTerms] = useState<Record<string, string>>({});
  const [selectedRegion, setSelectedRegion] = useState("");

  const updateChangeForm = (
    entityId: number,
    field: keyof EntityChangeFormData,
    value: string | number | null
  ) => {
    setChangeForms((prev) =>
      prev.map((form) =>
        form.entityId === entityId ? { ...form, [field]: value } : form
      )
    );
  };

  const addReferenceToChange = (entityId: number) => {
    setChangeForms((prev) =>
      prev.map((form) =>
        form.entityId === entityId
          ? {
            ...form,
            references: [
              ...(form.references ?? []),
              {
                referencedField: "",
                type: "Website",
                value: "",
                language: "en",
                accessedAt: new Date().toISOString().split("T")[0],
                comment: "",
              },
            ],
          }
          : form
      )
    );
  };

  const removeReferenceFromChange = (entityId: number, refIdx: number) => {
    setChangeForms((prev) =>
      prev.map((form) =>
        form.entityId === entityId
          ? { ...form, references: (form.references ?? []).filter((_, i) => i !== refIdx) }
          : form
      )
    );
  };

  const handleChangeReferenceChange = (
    entityId: number,
    refIdx: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setChangeForms((prev) =>
      prev.map((form) =>
        form.entityId === entityId
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

  useEffect(() => {
    if (loadingAuth) return;
    if (!([RoleEnum.ADMIN, RoleEnum.DATAMANAGER, RoleEnum.EDITOR, RoleEnum.CONTRIBUTOR] as string[]).includes(auth?.role ?? '')) {
      setLoadingData(false);
      return;
    }
    const controller = new AbortController();
    const fetchentities = async () => {
      setLoadingData(true);
      try {
        const res = await fetch(`/api/entities/`, { signal: controller.signal });
        const data: Entities[] = await res.json();
        setEntities(data);

        // Build country → entities map (entity may appear in multiple countries)
        const byCountry: Record<string, { entities: Entities[]; country: Countries }> = {};
        data.forEach((e) => {
          e.EntitiesInCountries.forEach(({ Countries: c }) => {
            if (!byCountry[c.countrycodePolpal]) {
              byCountry[c.countrycodePolpal] = { entities: [], country: c };
            }
            byCountry[c.countrycodePolpal].entities.push(e);
          });
        });
        setAllEntitiesByCountry(byCountry);
      } catch (err: unknown) {
        if (!(err instanceof Error) || err.name === 'AbortError') return;
        setErrorSubmit("Failed to load entities");
      } finally {
        setLoadingData(false);
      }
    };
    fetchentities();
    return () => controller.abort();
  }, [loadingAuth, auth?.role]);

  useEffect(() => {
    if (!polpalId) return;
    if (loadingAuth) return;
    if (!([RoleEnum.ADMIN, RoleEnum.DATAMANAGER, RoleEnum.EDITOR, RoleEnum.CONTRIBUTOR] as string[]).includes(auth?.role ?? '')) {
      return;
    }
    const controller = new AbortController();
    const fetchEntity = async () => {
      try {
        const res = await fetch(`/api/entities/${polpalId}`, { signal: controller.signal });
        const data: Entity = await res.json();
        setEntity(data);

        const codes = data.EntitiesInCountries?.map(
          (eic: { countrycodePolpal: string }) => eic.countrycodePolpal
        ) ?? [];
        setEntityCountries(codes);
        const initCollapsed: Record<string, boolean> = {};
        codes.forEach((code: string) => { initCollapsed[code] = true; });
        setCountryCollapsed(initCollapsed);
      } catch (err: unknown) {
        if (!(err instanceof Error) || err.name === 'AbortError') return;
        setErrorSubmit("Failed to load entity");
      }
    };
    fetchEntity();
    return () => controller.abort();
  }, [polpalId, loadingAuth, auth?.role]);


  if (loadingData || loadingAuth)
    return <LoadingSpinner title="Loading entities..." message="Fetching data. Please wait a moment." />;

  if (!([RoleEnum.ADMIN, RoleEnum.DATAMANAGER, RoleEnum.EDITOR, RoleEnum.CONTRIBUTOR] as string[]).includes(auth?.role ?? '')) {
    return <AccessDenied message="ADMIN, DATAMANAGER, EDITOR or CONTRIBUTOR rights are required to create entity changes." />;
  }

  // Show error if the fetched entity is not a party
  if (entity && entity.entityType !== "PARTY") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2 text-red-600">Invalid Operation</h1>
          <p className="mb-2 text-gray-700">GROUPING, INDIVIDUALS, OTHERS, RESIDUALS, UNKNOWN cannot have predecessors or successors.</p>
          <p className="mb-6 text-sm text-gray-500">Please select an entity that is classified as PARTY.</p>
          <button
            className="px-6 py-2 bg-primary text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            onClick={() => router.back()}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (changeForms.length === 0) {
      setErrorSubmit("Please select at least one entity");
      return;
    }
    if (changeForms.some((f) => !f.changeYear)) {
      setErrorSubmit("All selected entities must have a year");
      return;
    }

    setLoadingSubmit(true);
    setErrorSubmit(null);

    try {
      for (const form of changeForms) {
        const polpalIdOld = predecessorId ? Number(predecessorId) : form.entityId;
        const polpalIdNew = successorId ? Number(successorId) : form.entityId;

        const { references: _refs, entityId: _id, ...rest } = form;
        const body = { ...rest, polpalIdOld, polpalIdNew };

        const res = await fetch(`/api/entity-changes/`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) throw new Error("Failed to create entity change");
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
                  entityChangeId: created.entityChangeId,
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
      setErrorSubmit(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoadingSubmit(false);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const isEligibleCandidate = (p: Entities) =>
    p.polpalId.toString() !== polpalId && p.entityType !== EntityTypesEnum.GROUPING;

  const toCardEntity = (p: Entities): EntityCardEntity => ({
    polpalId: p.polpalId,
    partyfactsId: p.partyfactsId ?? null,
    nameShort: p.nameShort,
    nameEnglish: p.nameEnglish,
    name: p.name,
    entityType: p.entityType,
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
    entityList: Entities[],
    country: Countries,
    title: string,
    isPriorityCountry: boolean = false
  ) => {
    const localSearchTerm = localSearchTerms[countryCode] ?? "";
    const eligibleCount = entityList.filter(isEligibleCandidate).length;
    if (eligibleCount === 0) return null;

    const q = localSearchTerm.toLowerCase();
    const filtered = entityList
      .filter((p) => {
        if (!isEligibleCandidate(p)) return false;
        return (
          localSearchTerm === "" ||
          p.nameEnglish.toLowerCase().includes(q) ||
          p.nameShort.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          (p.EntityNames?.some((n) => n.nameShort.toLowerCase().includes(q)) ?? false) ||
          (p.EntityNames?.some((n) => n.name.toLowerCase().includes(q)) ?? false) ||
          String(p.polpalId).includes(q)
        );
      })
      .sort((a, b) => a.nameShort.localeCompare(b.nameShort));

    const isCollapsed = isPriorityCountry && countryCollapsed[countryCode];

    return (
      <div key={countryCode} className="rounded-lg border border-gray-200 overflow-hidden">
        <div
          className={`flex items-center justify-between px-4 py-3 font-semibold text-sm ${isPriorityCountry
            ? "bg-blue-100 cursor-pointer hover:bg-blue-200 transition-colors"
            : "bg-gray-100"
            }`}
          onClick={isPriorityCountry ? () => setCountryCollapsed((prev) => ({ ...prev, [countryCode]: !prev[countryCode] })) : undefined}
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

            <div className="p-4 bg-gray-50 max-h-[40rem] overflow-y-auto">
              {filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
                  {filtered.map((p) => {
                    const selected = changeForms.some((f) => f.entityId === p.polpalId);
                    return (
                      <div
                        key={p.polpalId}
                        onClick={() => {
                          if (selected) {
                            setChangeForms((prev) => prev.filter((f) => f.entityId !== p.polpalId));
                          } else {
                            setChangeForms((prev) => [...prev, {
                              entityId: p.polpalId,
                              changeType: EntityChangesEnum.UNKNOWN,
                              changeYear: new Date().getFullYear(),
                              changeMonth: null,
                              changeDay: null,
                              comment: null,
                            }]);
                          }
                        }}
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

  // ── Computed values for render ────────────────────────────────────────────────

  const allRegions = [
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
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Countries", href: "/data/countries" },
        { label: <CountryBreadcrumbLinks countries={entity?.EntitiesInCountries} /> },
        { label: entity ? `${entity.nameShort}` : "...", href: `/data/entities/${polpalId}` },
        { label: "add change" },
      ]} />

      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Create PolPaL Party Change</h1>
            <p className="text-lg text-gray-600">
              Define a relationship between {predecessorId ? "predecessor and successor" : "successor and predecessor"} PolPaL parties.
            </p>
          </div>
        </div>
      </div>

      {/* Information Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowInfo((prev) => !prev)}
          className="flex items-center gap-3 w-full p-6 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="bg-blue-100 rounded-lg p-3 flex-shrink-0">
            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800">PolPaL party change definitions</h2>
          </div>
          {showInfo ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
        </button>
        {showInfo && (
          <div className="px-6 pb-6">
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="w-full text-sm text-gray-700">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900 w-48 border-b border-gray-200">
                      Change Type
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900 border-b border-gray-200">
                      Definition
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-4 align-top font-semibold text-gray-900">Split</td>
                    <td className="px-4 py-4 space-y-2">
                      <p>
                        A significant number of members of a political party are leaving the
                        party and forming a new party. The former political party continues to exist.
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-4 align-top font-semibold text-gray-900">Merge</td>
                    <td className="px-4 py-4 space-y-2">
                      <ul className="list-disc pl-4 space-y-1">
                        <li>
                          One political party joins into another political party
                          and ceases to exist in its original form.
                        </li>
                        <li>
                          Two or more political parties join together to form a new
                          party. The former political parties cease to exist.
                        </li>
                      </ul>
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-4 align-top font-semibold text-gray-900">Split-Merge</td>
                    <td className="px-4 py-4 space-y-2">
                      <ul className="list-disc pl-4 space-y-1">
                        <li>
                          A significant number of members of a political party are
                          leaving the party and joining another party. The original
                          political party either continues or ceases to exist.
                        </li>
                        <li>
                          A significant number of members of two or more political
                          parties leave their respective parties and form a new party
                          together. The original political parties either continue or
                          cease to exist.
                        </li>
                      </ul>
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-4 align-top font-semibold text-gray-900">Rebrand</td>
                    <td className="px-4 py-4 space-y-2">
                      <p>
                        A political party restructures its party organization. 
                        This constitutes more than a formal change of the party 
                        name. The former political party ceases to exist.
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td className="px-4 py-4 align-top font-semibold text-gray-900">Unknown</td>
                    <td className="px-4 py-4 space-y-2">
                      <p>
                        In the event that information is available regarding a 
                        party change, but it is unclear in what form and to 
                        what extent the change has occurred.
                      </p>
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Main Form Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-8">
          <div className="space-y-8">
            {/* Step 1: Locked Entity */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-gray-200 pb-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shrink-0">1</span>
                <h3 className="text-lg font-semibold text-gray-900">Entity Information</h3>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {predecessorId ? "Predecessor (locked)" : "Successor (locked)"}
                </label>
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
              </div>

              {/* Existing changes */}
              {entity && ((entity.EntityChangeNew?.length ?? 0) > 0 || (entity.EntityChangeOld?.length ?? 0) > 0) && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Existing Changes</p>
                  {entity.EntityChangeNew?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Predecessors</p>
                      <div className="space-y-1">
                        {entity.EntityChangeNew.map((c) => (
                          <div key={c.entityChangeId} className="grid grid-cols-[1fr_5rem_5rem] sm:grid-cols-[7rem_1fr_7rem_5rem] items-center gap-2 text-xs bg-gray-50 border border-gray-200 rounded px-3 py-1.5">
                            <span className="font-medium text-gray-800 truncate">{c.nameShort}</span>
                            <span className="hidden sm:block text-gray-600 truncate">{c.nameEnglish}</span>
                            <span className="sm:block text-gray-500 truncate">{c.changeType}</span>
                            <span className="text-gray-400 text-left tabular-nums">{c.changeYear}{c.changeMonth ? `/${c.changeMonth}` : ""}{c.changeDay ? `/${c.changeDay}` : ""}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {entity.EntityChangeOld?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Successors</p>
                      <div className="space-y-1">
                        {entity.EntityChangeOld.map((c) => (
                          <div key={c.entityChangeId} className="grid grid-cols-[1fr_5rem_5rem] sm:grid-cols-[7rem_1fr_7rem_5rem] items-center gap-2 text-xs bg-gray-50 border border-gray-200 rounded px-3 py-1.5">
                            <span className="font-medium text-gray-800 truncate">{c.nameShort}</span>
                            <span className="hidden sm:block text-gray-600 truncate">{c.nameEnglish}</span>
                            <span className="sm:block text-gray-500 truncate">{c.changeType}</span>
                            <span className="text-gray-400 text-left tabular-nums">{c.changeYear}{c.changeMonth ? `/${c.changeMonth}` : ""}{c.changeDay ? `/${c.changeDay}` : ""}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Entity Selection */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-200 pb-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shrink-0">2</span>
                <h3 className="text-lg font-semibold text-gray-900">
                  Select {predecessorId ? "Successor" : "Predecessor"} Entit{changeForms.length !== 1 ? "ies" : "y"}
                  {changeForms.length > 0 && (
                    <span className="ml-3 text-sm font-normal text-primary">
                      {changeForms.length} selected
                    </span>
                  )}
                </h3>
              </div>

              <div className="space-y-6">
                {/* Assigned Countries */}
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

                {/* Other Countries */}
                <div>
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
                              {allRegions.map((region) => (
                                <option key={region} value={region}>
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
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
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
                                  <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-800/70 text-white shadow pointer-events-none select-none">
                                    {eligibleCount}
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

            {/* Step 3: Selected Entities */}
            {changeForms.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-200 pb-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shrink-0">3</span>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Selected {predecessorId ? "Successor" : "Predecessor"} Entit{changeForms.length !== 1 ? "ies" : "y"}
                  </h3>
                  <span className="ml-auto text-sm text-blue-700 font-medium bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                    {changeForms.length} selected
                  </span>
                </div>
                <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
                  {changeForms.map((form) => {
                    const foundEntity = entities.find((e) => e.polpalId === form.entityId);
                    if (!foundEntity) return null;
                    return (
                      <div
                        key={form.entityId}
                        className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow flex flex-col"
                      >
                        {/* Card Header */}
                        <div className="bg-blue-50 border-b border-blue-100 px-4 py-3 flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-sm text-gray-900 block truncate">{foundEntity.nameShort}</span>
                            <span className="text-xs text-gray-500 block truncate">{foundEntity.nameEnglish}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setChangeForms((prev) => prev.filter((f) => f.entityId !== form.entityId))}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors flex-shrink-0 mt-0.5"
                            title="Remove"
                            aria-label="Remove entity"
                          >
                            <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        {/* Entity details */}
                        <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100">
                          {foundEntity.name && (
                            <span className="text-xs text-gray-500 truncate block">{foundEntity.name}</span>
                          )}
                          <span className="text-[11px] text-gray-400">
                            PolPaL ID:{" "}
                            <Link href={`/data/entities/${foundEntity.polpalId}`} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                              {foundEntity.polpalId}
                            </Link>
                          </span>
                        </div>

                        {/* Form fields */}
                        <div className="p-4 space-y-4 flex-1">
                          {/* Change Type */}
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                              Change Type <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={form.changeType}
                              onChange={(e) => updateChangeForm(form.entityId, "changeType", e.target.value)}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                            >
                              {Object.values(EntityChangesEnum).map((type) => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </select>
                          </div>

                          {/* Date */}
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                              Date <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-1.5">
                              <div>
                                <div className="text-[10px] text-gray-400 mb-0.5 text-left px-1">Year</div>
                                <input
                                  type="number"
                                  placeholder="YYYY"
                                  min={1800}
                                  max={2100}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                                  value={form.changeYear ?? ""}
                                  onChange={(e) => updateChangeForm(form.entityId, "changeYear", e.target.value ? Number(e.target.value) : null)}
                                />
                              </div>
                              <div>
                                <div className="text-[10px] text-gray-400 mb-0.5 text-left px-1">Mo</div>
                                <input
                                  type="number"
                                  placeholder="MM"
                                  min={1}
                                  max={12}
                                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                                  value={form.changeMonth ?? ""}
                                  onChange={(e) => updateChangeForm(form.entityId, "changeMonth", e.target.value ? Number(e.target.value) : null)}
                                />
                              </div>
                              <div>
                                <div className="text-[10px] text-gray-400 mb-0.5 text-left px-1">Day</div>
                                <input
                                  type="number"
                                  placeholder="DD"
                                  min={1}
                                  max={31}
                                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                                  value={form.changeDay ?? ""}
                                  onChange={(e) => updateChangeForm(form.entityId, "changeDay", e.target.value ? Number(e.target.value) : null)}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Comment */}
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                              Comment <span className="font-normal normal-case">(optional)</span>
                            </label>
                            <textarea
                              placeholder="Add a comment…"
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                              value={form.comment ?? ""}
                              onChange={(e) => updateChangeForm(form.entityId, "comment", e.target.value || null)}
                            />
                          </div>

                          {/* References */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-medium text-gray-700">References</label>
                              <button
                                type="button"
                                onClick={() => addReferenceToChange(form.entityId)}
                                className="inline-flex items-center px-3 py-1 text-xs font-medium text-primary bg-blue-50 border border-transparent rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                              >
                                + Add Reference
                              </button>
                            </div>
                            {(form.references ?? []).length === 0 ? (
                              <p className="text-xs text-gray-400">No references (optional)</p>
                            ) : (
                              <div className="space-y-2">
                                {(form.references ?? []).map((ref, refIdx) => (
                                  <NewReferenceFormRow
                                    key={refIdx}
                                    index={refIdx}
                                    data={ref}
                                    fields={ENTITY_CHANGE_REFERENCE_FIELDS}
                                    fieldDefaultLabel="Entire Change"
                                    fieldLocked
                                    onChange={(e) => handleChangeReferenceChange(form.entityId, refIdx, e)}
                                    onRemove={() => removeReferenceFromChange(form.entityId, refIdx)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4">
            <div className="text-sm text-gray-600">
              {changeForms.length > 0 ? (
                <span>{changeForms.length} entit{changeForms.length !== 1 ? "ies" : "y"} selected for change relationship</span>
              ) : (
                <span>Please select entities to create the change relationship</span>
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
                disabled={loadingSubmit || changeForms.length === 0 || changeForms.some((f) => !f.changeYear)}
                className="w-full sm:w-auto px-6 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingSubmit ? (
                  <>
                    <svg aria-hidden="true" className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  `Create Entity Change${changeForms.length > 1 ? "s" : ""}`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {errorSubmit && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg aria-hidden="true" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{errorSubmit}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
