"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Trash2, Loader2 } from "lucide-react";

import Breadcrumbs from "@/components/ui/Breadcrumbs";
import CountryBreadcrumbLinks from "@/components/ui/CountryBreadcrumbLinks";
import { CountryCard, CountryCardCountry } from "@/components/ui/CountryCard";
import CountryFlag from "@/components/ui/DisplayFlags";
import { NewReferenceFormRow, NewReferenceData } from "@/components/manage/NewReferenceFormRow";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/context/AuthContext";
import { RoleEnum } from "@/lib/shared/enums";
import { AccessDenied } from "@/components/ui/AccessDenied";

const ENTITY_IN_COUNTRY_REFERENCE_FIELDS: { value: string; label: string }[] = [];

interface EntityInCountryLink {
  entityInCountryId: number;
  countrycodePolpal: string;
  Countries: CountryCardCountry;
}

interface Entity {
  polpalId: number;
  nameShort: string;
  nameEnglish: string;
  EntitiesInCountries: EntityInCountryLink[];
}

interface CountryWithCount extends CountryCardCountry {
  entitiesCount: number;
}

export default function CreateEntityInCountryClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const polpalIdParam = searchParams.get("polpalId");
  const polpalId = polpalIdParam ? Number(polpalIdParam) : null;

  // Authentication
  const { auth, loadingAuth } = useAuth();

  const [countries, setCountries] = useState<CountryWithCount[]>([]);
  const [entity, setEntity] = useState<Entity | null>(null);
  const [existingLinks, setExistingLinks] = useState<EntityInCountryLink[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [errorSubmit, setErrorSubmit] = useState<string | null>(null);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [expandedRegions, setExpandedRegions] = useState<Record<string, boolean>>({});
  const [countryReferences, setCountryReferences] = useState<Record<string, NewReferenceData[]>>({});
  const [countryComments, setCountryComments] = useState<Record<string, string>>({});

  const emptyReference = (): NewReferenceData => ({
    referencedField: "",
    type: "Website",
    value: "",
    language: "en",
    accessedAt: new Date().toISOString().split("T")[0],
    comment: "",
  });

  const addReferenceToCountry = (code: string) =>
    setCountryReferences((prev) => ({ ...prev, [code]: [...(prev[code] ?? []), emptyReference()] }));

  const removeReferenceFromCountry = (code: string, idx: number) =>
    setCountryReferences((prev) => ({ ...prev, [code]: (prev[code] ?? []).filter((_, i) => i !== idx) }));

  const handleCountryReferenceChange = (
    code: string,
    idx: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setCountryReferences((prev) => ({
      ...prev,
      [code]: (prev[code] ?? []).map((ref, i) => (i === idx ? { ...ref, [name]: value } : ref)),
    }));
  };

  // Fetch all countries for the picker
  useEffect(() => {
    if (loadingAuth) return;
    if (!([RoleEnum.ADMIN, RoleEnum.DATAMANAGER, RoleEnum.EDITOR] as string[]).includes(auth?.role ?? '')) {
      return;
    }
    const controller = new AbortController();
    fetch(`/api/countries/counts`, { credentials: "include", signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch countries");
        const data = await res.json();
        setCountries(Array.isArray(data) ? data : []);
      })
      .catch((err) => { if (err instanceof Error && err.name !== "AbortError") setErrorSubmit("Failed to load countries"); });
    return () => controller.abort();
  }, [loadingAuth, auth?.role]);

  // Fetch entity info (including existing links with full country data)
  useEffect(() => {
    if (!polpalId) return;
    if (loadingAuth) return;
    if (!([RoleEnum.ADMIN, RoleEnum.DATAMANAGER, RoleEnum.EDITOR] as string[]).includes(auth?.role ?? '')) {
      setLoadingData(false);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/entities-in-countries/entities/info/${polpalId}`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch entity info");
        const data = await res.json();
        const entityData = data?.entity ?? data?.data ?? (Array.isArray(data) ? data[0] : data);
        setEntity(entityData);
        setExistingLinks(entityData?.EntitiesInCountries ?? []);
      })
      .catch((err) => { if (err instanceof Error && err.name !== "AbortError") setErrorSubmit("Failed to load entity info"); })
      .finally(() => setLoadingData(false));
    return () => controller.abort();
  }, [polpalId, loadingAuth, auth?.role]);

  const existingCountryCodes = existingLinks.map((l) => l.countrycodePolpal);

  const handleRemoveLink = async (link: EntityInCountryLink) => {
    const name = link.Countries?.countryname ?? link.countrycodePolpal;
    const confirmed = window.confirm(
      `Remove "${name}" from this entity?\n\nThis will permanently delete the country assignment and any associated references. This action cannot be undone.`
    );
    if (!confirmed) return;

    setRemovingId(link.entityInCountryId);
    try {
      const res = await fetch(`/api/entities-in-countries/${link.entityInCountryId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove country link");
      setExistingLinks((prev) => prev.filter((l) => l.entityInCountryId !== link.entityInCountryId));
    } catch (err: unknown) {
      setErrorSubmit((err as Error).message ?? "Failed to remove country");
    } finally {
      setRemovingId(null);
    }
  };

  const toggleCountrySelection = (code: string) => {
    if (selectedCountries.includes(code)) {
      setSelectedCountries((prev) => prev.filter((c) => c !== code));
      setCountryReferences((prev) => { const n = { ...prev }; delete n[code]; return n; });
      setCountryComments((prev) => { const n = { ...prev }; delete n[code]; return n; });
    } else {
      setSelectedCountries((prev) => [...prev, code]);
      setCountryReferences((prev) => ({ ...prev, [code]: prev[code] ?? [] }));
    }
  };

  const toggleRegion = (region: string) =>
    setExpandedRegions((prev) => ({ ...prev, [region]: !prev[region] }));

  const handleSelectAll = () => {
    const codes = countries
      .filter((c) => !existingCountryCodes.includes(c.countrycodePolpal))
      .map((c) => c.countrycodePolpal);
    setSelectedCountries(codes);
    setCountryReferences((prev) => {
      const n = { ...prev };
      codes.forEach((code) => { if (!n[code]) n[code] = []; });
      return n;
    });
  };

  const handleDeselectAll = () => {
    setSelectedCountries([]);
    setCountryReferences({});
    setCountryComments({});
  };

  const handleSubmit = async () => {
    setLoadingSubmit(true);
    setErrorSubmit(null);

    if (!polpalId || isNaN(polpalId)) {
      setErrorSubmit("Missing or invalid polpalId from URL");
      setLoadingSubmit(false);
      return;
    }
    if (selectedCountries.length === 0) {
      setErrorSubmit("Please select at least one country");
      setLoadingSubmit(false);
      return;
    }

    try {
      const results: { code: string; status: "ok" | "exists" | "error"; msg?: string }[] = [];

      for (const countrycodePolpal of selectedCountries) {
        try {
          const res = await fetch(`/api/entities-in-countries/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              polpalId: Number(polpalId),
              countrycodePolpal,
              comment: countryComments[countrycodePolpal]?.trim() || null,
            }),
          });

          if (!res.ok) {
            const text = await res.text();
            if (text.includes("Unique constraint failed")) {
              results.push({ code: countrycodePolpal, status: "exists" });
              continue;
            }
            results.push({ code: countrycodePolpal, status: "error", msg: text });
            continue;
          }

          const created = await res.json();
          const validRefs = (countryReferences[countrycodePolpal] ?? []).filter((r) => r.value.trim() !== "");
          if (validRefs.length > 0) {
            await Promise.all(
              validRefs.map((r) =>
                fetch(`/api/references`, {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    entitiesInCountriesId: created.entityInCountryId,
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
          results.push({ code: countrycodePolpal, status: "ok" });
        } catch (innerErr: unknown) {
          results.push({ code: countrycodePolpal, status: "error", msg: (innerErr as Error).message });
        }
      }

      const added = results.filter((r) => r.status === "ok").length;
      const existing = results.filter((r) => r.status === "exists").length;
      const failed = results.filter((r) => r.status === "error").length;

      let message = "";
      if (added > 0) message += `✅ ${added} added. `;
      if (existing > 0) message += `⚠️ ${existing} already existed. `;
      if (failed > 0) message += `❌ ${failed} failed. `;
      if (!message) message = "No countries were added.";

      setErrorSubmit(message);
      if (added > 0 || existing > 0) {
        setTimeout(() => router.push(`/data/entities/${polpalId}`), 2000);
      }
    } catch (err: unknown) {
      setErrorSubmit((err as Error).message ?? "Unexpected error while adding countries");
    } finally {
      setLoadingSubmit(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loadingData || loadingAuth) {
    return <LoadingSpinner title="Loading..." message="Fetching data. Please wait a moment." />;
  }

  if (!([RoleEnum.ADMIN, RoleEnum.DATAMANAGER, RoleEnum.EDITOR] as string[]).includes(auth?.role ?? '')) {
    return <AccessDenied message="ADMIN, DATAMANAGER or EDITOR rights are required to manage entity country links." />;
  }

  // ── Derived data ───────────────────────────────────────────────────────────
  const availableCountries = countries.filter((c) => !existingCountryCodes.includes(c.countrycodePolpal));

  const grouped = availableCountries.reduce((acc: Record<string, CountryWithCount[]>, c) => {
    const region = c.region ?? "Unknown Region";
    if (!acc[region]) acc[region] = [];
    acc[region].push(c);
    return acc;
  }, {});
  Object.keys(grouped).forEach((r) =>
    grouped[r].sort((a, b) => a.countryname.localeCompare(b.countryname))
  );
  const sortedRegions = Object.keys(grouped).sort((a, b) => {
    const aM = !a || a === "Unknown Region";
    const bM = !b || b === "Unknown Region";
    if (aM && !bM) return 1;
    if (!aM && bM) return -1;
    return a.localeCompare(b);
  });

  const breadcrumbCountries = existingLinks.map((l) => ({
    countrycodePolpal: l.countrycodePolpal,
    countryname: l.Countries?.countryname,
  }));

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* Breadcrumbs */}
      <Breadcrumbs items={[
        { label: "Home", href: "/" },
        { label: "Countries", href: "/data/countries" },
        { label: <CountryBreadcrumbLinks countries={breadcrumbCountries} /> },
        { label: entity ? entity.nameShort : "...", href: `/data/entities/${polpalId}` },
        { label: "manage countries" },
      ]} />

      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Manage Countries</h1>
          <p className="text-lg text-gray-600">
            {entity
              ? `${entity.nameEnglish} (${entity.nameShort})`
              : `Entity ${polpalId}`}
          </p>
        </div>
      </div>
      </div>

      {/* Error / Status */}
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

      {/* Current Countries */}
      {existingLinks.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex items-center gap-3 border-b border-gray-200 pb-2 mb-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shrink-0">1</span>
              <h3 className="text-lg font-semibold text-gray-900">Current Countries</h3>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {existingLinks.length}
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Hover a card and click{" "}
              <Trash2 className="w-3.5 h-3.5 inline text-red-400" />{" "}
              to remove the country assignment.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {existingLinks.map((link) => (
                <div key={link.entityInCountryId} className="relative group">
                  <CountryCard country={link.Countries} />
                  <button
                    type="button"
                    onClick={() => handleRemoveLink(link)}
                    disabled={removingId === link.entityInCountryId}
                    className="absolute top-2 right-2 p-1.5 text-red-400 hover:text-red-600 bg-white hover:bg-red-50 border border-red-200 rounded-full shadow-sm transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={`Remove ${link.Countries?.countryname ?? link.countrycodePolpal}`}
                    aria-label={`Remove ${link.Countries?.countryname ?? link.countrycodePolpal}`}
                  >
                    {removingId === link.entityInCountryId
                      ? <Loader2 aria-hidden="true" className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Countries */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6">

          {/* Section header */}
          <div className="flex flex-col gap-3 border-b border-gray-200 pb-2 mb-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3 flex-1">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shrink-0">2</span>
              <h3 className="text-lg font-semibold text-gray-900">Add Countries</h3>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                disabled={loadingSubmit || availableCountries.length === 0}
                className="px-3 py-1.5 text-xs font-medium text-primary bg-blue-50 border border-primary rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                disabled={loadingSubmit || selectedCountries.length === 0}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Region accordion */}
          {availableCountries.length === 0 ? (
            <p className="text-center text-gray-500 italic py-8">
              This entity is already assigned to all available countries.
            </p>
          ) : (
            <div className="space-y-3">
              {sortedRegions.map((region) => {
                const list = grouped[region];
                const isExpanded = expandedRegions[region] ?? false;
                const selectedInRegion = list.filter((c) =>
                  selectedCountries.includes(c.countrycodePolpal)
                ).length;

                return (
                  <div key={region} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleRegion(region)}
                      className="flex items-center justify-between w-full bg-gray-50 px-5 py-3.5 text-left font-semibold text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 transition-colors"
                    >
                      <span className="text-sm">
                        {region === "Unknown Region"
                          ? <span className="italic text-gray-500">Unknown Region</span>
                          : region}
                      </span>
                      <div className="flex items-center gap-3 text-gray-500">
                        {selectedInRegion > 0 && (
                          <span className="text-xs font-medium text-primary bg-blue-50 px-2 py-0.5 rounded-full">
                            {selectedInRegion} selected
                          </span>
                        )}
                        <span className="text-xs">{list.length} countries</span>
                        {isExpanded
                          ? <ChevronDown className="w-4 h-4" />
                          : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-4 bg-white grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
                        {list.map((c) => {
                          const isSelected = selectedCountries.includes(c.countrycodePolpal);
                          return (
                            <div
                              key={c.countrycodePolpal}
                              onClick={() => toggleCountrySelection(c.countrycodePolpal)}
                              className={`relative cursor-pointer rounded-lg transition-all ${
                                isSelected
                                  ? "ring-2 ring-primary shadow-md"
                                  : "hover:ring-1 hover:ring-gray-300 hover:shadow-sm"
                              }`}
                            >
                              <CountryCard country={c} />
                              <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-gray-500 bg-gray-100 shadow pointer-events-none select-none">
                                {c.entitiesCount} entit{c.entitiesCount !== 1 ? "ies" : "y"}
                              </div>
                              <div className={`absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold shadow pointer-events-none select-none ${
                                isSelected ? "bg-primary text-white" : "bg-white/90 border border-gray-200 text-gray-500"
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
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* References per selected country */}
        {selectedCountries.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 space-y-4">
            <div className="flex items-center gap-3 border-b border-gray-200 pb-2 mb-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shrink-0">3</span>
              <h3 className="text-lg font-semibold text-gray-900">Add Comment &amp; References</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Optional references for each selected country.
            </p>
            {selectedCountries.map((code) => {
              const country = countries.find((c) => c.countrycodePolpal === code);
              const refs = countryReferences[code] ?? [];
              return (
                <div key={code} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <CountryFlag
                        iso2c={country?.iso2c}
                        countrycodePolpal={code}
                        countryname={country?.countryname ?? code}
                        size={20}
                      />
                      <span className="font-medium text-gray-800 text-sm">
                        {country?.countryname ?? code}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">({code})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => addReferenceToCountry(code)}
                      className="self-start sm:self-auto inline-flex items-center px-3 py-1 text-xs font-medium text-primary bg-blue-50 border border-transparent rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                    >
                      + Add Reference
                    </button>
                  </div>
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Comment <span className="text-gray-400 font-normal">(optional)</span></label>
                    <textarea
                      rows={2}
                      value={countryComments[code] ?? ""}
                      onChange={(e) => setCountryComments((prev) => ({ ...prev, [code]: e.target.value }))}
                      placeholder="Notes about this country assignment…"
                      className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                    />
                  </div>
                  {refs.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No references (optional)</p>
                  ) : (
                    <div className="space-y-3">
                      {refs.map((ref, idx) => (
                        <NewReferenceFormRow
                          key={idx}
                          index={idx}
                          data={ref}
                          fields={ENTITY_IN_COUNTRY_REFERENCE_FIELDS}
                          fieldDefaultLabel="Entire Relationship"
                          fieldLocked
                          onChange={(e) => handleCountryReferenceChange(code, idx, e)}
                          onRemove={() => removeReferenceFromCountry(code, idx)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-4">
            <div className="text-sm text-gray-600">
              {selectedCountries.length > 0 ? (
                <span>
                  {selectedCountries.length} countr{selectedCountries.length !== 1 ? "ies" : "y"} selected to add
                </span>
              ) : (
                <span className="text-gray-400">Select countries above to add them</span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => router.push(`/data/entities/${polpalId}`)}
                disabled={loadingSubmit}
                className="w-full sm:w-auto px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={loadingSubmit || selectedCountries.length === 0}
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
                  `Add ${selectedCountries.length} Countr${selectedCountries.length !== 1 ? "ies" : "y"}`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

