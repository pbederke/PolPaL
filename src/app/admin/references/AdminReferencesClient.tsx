"use client";

import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { useEffect, useState, useMemo } from "react";
import PaginationControls from "@/components/ui/PaginationControls";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { ReferenceTypeEnum, RoleEnum } from "@/lib/shared/enums";

// =====================
// Types
// =====================
interface Reference {
  referenceId: number;
  polpalId: number | null;
  entitiesInCountriesId: number | null;
  entityChangeId: number | null;
  entityNameId: number | null;
  groupingMemberId: number | null;
  userId: number | null;
  referencedField: string | null;
  type: ReferenceTypeEnum;
  value: string;
  language: string | null;
  accessedAt: string | null;
  comment: string | null;
}

interface Filters {
  referenceId: string;
  userId: string;
}

const emptyFilters: Filters = {
  referenceId: "",
  userId: "",
};

const emptyToggles = {
  polpalId: false, entitiesInCountriesId: false, entityChangeId: false,
  entityNameId: false, groupingMemberId: false,
};

const toggleGroups: { label: string; keys: (keyof typeof emptyToggles)[]; shortLabel: Record<string, string> }[] = [
  {
    label: "Entity IDs",
    keys: ["polpalId", "entitiesInCountriesId", "entityChangeId", "entityNameId", "groupingMemberId"],
    shortLabel: {
      polpalId: "polpalId",
      entitiesInCountriesId: "entitiesInCountries",
      entityChangeId: "entityChange",
      entityNameId: "entityName",
      groupingMemberId: "groupingMember",
    },
  },
];

// =====================
// Filter input component
// =====================
function FilterField({
  field,
  label,
  value,
  onChange,
}: {
  field: keyof Filters;
  label?: string;
  value: string;
  onChange: (key: keyof Filters, val: string) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide" htmlFor={`filter-${field}`}>
        {label ?? field}
      </label>
      <input
        id={`filter-${field}`}
        type="text"
        value={value}
        onChange={(e) => onChange(field, e.target.value)}
        placeholder="exact match"
        className={`h-7 w-full rounded border px-2 text-xs transition-colors focus:outline-none ${
          value
            ? "border-blue-400 bg-blue-50 focus:border-blue-500"
            : "border-gray-200 bg-gray-50 focus:border-gray-400 focus:bg-white"
        }`}
      />
    </div>
  );
}

export default function AdminReferencesClient() {
  // =====================
  // State & Auth
  // =====================
  const { auth, loadingAuth } = useAuth();
  const [references, setReferences] = useState<Reference[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [toggleFilters, setToggleFilters] = useState(emptyToggles);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // =====================
  // Effects
  // =====================
  useEffect(() => {
    if (loadingAuth) return;
    if (!auth.loggedIn || auth.role !== RoleEnum.ADMIN) return;
    const controller = new AbortController();
    async function fetchReferences() {
      setLoadingData(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/references/", {
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to load references.");
        const data = await res.json();
        setReferences(data);
      } catch (err: unknown) {
        if (!(err instanceof Error) || err.name === "AbortError") return;
        console.error(err);
        setError(err instanceof Error ? err.message : "Error fetching references.");
      } finally {
        setLoadingData(false);
      }
    }
    fetchReferences();
    return () => controller.abort();
  }, [auth.loggedIn, auth.role, loadingAuth]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // =====================
  // Handlers
  // =====================
  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters(emptyFilters);
    setToggleFilters(emptyToggles);
  };

  const handleToggleFilter = (key: keyof typeof toggleFilters) => {
    setToggleFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDelete = async (referenceId: number) => {
    if (!confirm(`Are you sure you want to delete reference #${referenceId}?`)) return;
    try {
      const res = await fetch(`/api/admin/references/${referenceId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      setReferences((prev) => prev.filter((r) => r.referenceId !== referenceId));
    } catch (err) {
      alert(`Failed to delete reference: ${err}`);
    }
  };

  // =====================
  // Memoized Data
  // =====================
  const filteredReferences = useMemo(() => {
    return references.filter((r) => {
      const f = filters;
      if (f.referenceId && String(r.referenceId) !== f.referenceId.trim()) return false;
      if (f.userId && String(r.userId ?? "") !== f.userId.trim()) return false;
      if (toggleFilters.polpalId && !r.polpalId) return false;
      if (toggleFilters.entitiesInCountriesId && !r.entitiesInCountriesId) return false;
      if (toggleFilters.entityChangeId && !r.entityChangeId) return false;
      if (toggleFilters.entityNameId && !r.entityNameId) return false;
      if (toggleFilters.groupingMemberId && !r.groupingMemberId) return false;
      return true;
    });
  }, [references, filters, toggleFilters]);

  const pageCount = Math.ceil(filteredReferences.length / pageSize);
  const paginatedReferences = useMemo(
    () => filteredReferences.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filteredReferences, currentPage]
  );

  const activeFilterCount = Object.values(filters).filter((v) => v !== "").length + Object.values(toggleFilters).filter(Boolean).length;

  // =====================
  // Render: Guards
  // =====================
  if (!auth || loadingAuth) {
    return <LoadingSpinner title="Loading authentication..." message="Authenticating user. Please wait a moment." />;
  }
  if (auth.role !== RoleEnum.ADMIN) {
    return <AccessDenied message="ADMIN rights are required to view and manage references." />;
  }
  if (loadingData) {
    return <LoadingSpinner title="Loading references..." message="Fetching reference data. Please wait." />;
  }
  if (error) {
    return <ErrorState message={error} />;
  }

  // =====================
  // Render
  // =====================
  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Admin", href: "/admin" },
          { label: "References" },
        ]}
      />

      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">References</h1>
        <p className="text-gray-500">
          {references.length.toLocaleString()} total reference{references.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-700">Filters</h2>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                {activeFilterCount} active
              </span>
            )}
          </div>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs text-gray-400 hover:text-gray-700 underline transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="w-32">
              <FilterField field="referenceId" label="Reference ID" value={filters.referenceId} onChange={handleFilterChange} />
            </div>
            <div className="w-32">
              <FilterField field="userId" label="User ID" value={filters.userId} onChange={handleFilterChange} />
            </div>
          </div>
          <div className="pt-3 border-t border-gray-100 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300">Show only with</p>
            {toggleGroups.map((group) => (
              <div key={group.label}>
                <p className="text-[10px] font-semibold text-gray-400 mb-1.5">{group.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.keys.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleToggleFilter(key)}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                        toggleFilters[key]
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700"
                      }`}
                    >
                      {group.shortLabel[key]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Results</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {filteredReferences.length === references.length
                ? `${filteredReferences.length.toLocaleString()} reference${filteredReferences.length !== 1 ? "s" : ""}`
                : `${filteredReferences.length.toLocaleString()} of ${references.length.toLocaleString()} reference${references.length !== 1 ? "s" : ""}`}
              {pageCount > 1 && ` · page ${currentPage} of ${pageCount}`}
            </p>
          </div>
        </div>

        {filteredReferences.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">No references match the current filters.</p>
        ) : (
          <>
            {/* Scrollable table wrapper */}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-[11px] leading-tight">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {/* Sticky left: referenceId */}
                    <th scope="col" className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap border-r border-gray-200">
                      referenceId
                    </th>
                    {/* ID columns */}
                    <th scope="col" className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap bg-amber-50">polpalId</th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap bg-amber-50">entitiesInCountriesId</th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap bg-amber-50">entityChangeId</th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap bg-amber-50">entityNameId</th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap bg-amber-50">groupingMemberId</th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap bg-amber-50">userId</th>
                    {/* Data columns */}
                    <th scope="col" className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">referencedField</th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">type</th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap min-w-[200px]">value</th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">language</th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">accessedAt</th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap min-w-[150px]">comment</th>
                    {/* Sticky right: actions */}
                    <th scope="col" className="sticky right-0 z-10 bg-gray-50 px-3 py-2 border-l border-gray-200" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedReferences.map((r) => (
                    <tr key={r.referenceId} className="hover:bg-blue-50/40 transition-colors">
                      {/* Sticky left */}
                      <td className="sticky left-0 z-10 bg-white px-3 py-1.5 font-mono font-semibold text-gray-700 whitespace-nowrap border-r border-gray-100 hover:bg-blue-50/40">
                        {r.referenceId}
                      </td>
                      {/* ID cells — tinted */}
                      <td className="px-3 py-1.5 whitespace-nowrap text-gray-600 bg-amber-50/50">{r.polpalId ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-gray-600 bg-amber-50/50">{r.entitiesInCountriesId ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-gray-600 bg-amber-50/50">{r.entityChangeId ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-gray-600 bg-amber-50/50">{r.entityNameId ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-gray-600 bg-amber-50/50">{r.groupingMemberId ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-gray-600 bg-amber-50/50">{r.userId ?? <span className="text-gray-300">—</span>}</td>
                      {/* Data cells */}
                      <td className="px-3 py-1.5 whitespace-nowrap text-gray-700">{r.referencedField ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                          {r.type}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 max-w-[220px]">
                        <span className="block truncate text-gray-700" title={r.value}>{r.value}</span>
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-gray-600">{r.language ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-gray-600">{r.accessedAt ? new Date(r.accessedAt).toLocaleDateString() : <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-1.5 max-w-[160px]">
                        <span className="block truncate text-gray-600" title={r.comment ?? ""}>{r.comment ?? <span className="text-gray-300">—</span>}</span>
                      </td>
                      {/* Sticky right */}
                      <td className="sticky right-0 z-10 bg-white px-2 py-1.5 border-l border-gray-100 hover:bg-blue-50/40">
                        <button
                          type="button"
                          onClick={() => handleDelete(r.referenceId)}
                          className="px-2 py-1 rounded text-red-400 hover:text-red-700 hover:bg-red-50 transition-colors"
                          title="Delete reference"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <PaginationControls
              currentPage={currentPage}
              pageCount={pageCount}
              onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
              onNext={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
              variant="simple"
            />
          </>
        )}
      </div>
    </div>
  );
}
