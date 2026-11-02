"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import { ButtonDownload } from "@/components/ui/Buttons";
import { Input } from "@/components/ui/Input";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { ChevronDownIcon, CheckIcon, ChevronDown, ChevronRight } from "lucide-react";
import CountryFlag from "@/components/ui/DisplayFlags";

interface Version {
  projectKey: string;
  projectNameShort: string;
  projectName: string;
  datasetKey: string;
  datasetNameShort: string;
  datasetName: string;
  versionKey: string;
  version: string;
  versionName?: string;
  versionUrl?: string;
}

interface GeoFilters {
  countries: { countrycodePolpal: string; countryname: string; region: string | null; iso2c: string | null }[];
  regions: string[];
}

interface EntryFilters extends GeoFilters {
  yearMin: number | null;
  yearMax: number | null;
  variables: string[];
}

function startDownload(url: string) {
  const link = document.createElement("a");
  link.href = url;
  link.click();
}

// ─── Searchable select ───────────────────────────────────────────────────────

interface SearchableSelectProps {
  value: string;
  onValueChange: (v: string) => void;
  placeholder: string;
  items: { key: string; label: string; shortLabel?: string }[];
  disabled?: boolean;
}

function SearchableSelect({ value, onValueChange, placeholder, items, disabled }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = items.find(i => i.key === value);
  const filtered = search.trim()
    ? items.filter(i => i.label.toLowerCase().includes(search.toLowerCase()))
    : items;

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        title={selected ? selected.label : placeholder}
        onClick={() => { if (!disabled) { setOpen(v => !v); setSearch(""); } }}
        className="border-input flex w-full overflow-hidden items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 h-9"
      >
        <span className={`min-w-0 truncate ${selected ? "text-foreground" : "text-muted-foreground"}`}>
          {selected ? (
            <>
              <span className="sm:hidden">{selected.shortLabel ?? selected.label}</span>
              <span className="hidden sm:inline">{selected.label}</span>
            </>
          ) : placeholder}
        </span>
        <ChevronDownIcon className="size-4 opacity-50 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[8rem] bg-popover text-popover-foreground rounded-md border shadow-md">
          <div className="p-1 border-b">
            <input
              autoFocus
              type="text"
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-2 py-1 text-sm outline-none bg-transparent"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-2 py-2 text-sm text-muted-foreground text-center">No results</p>
            ) : (
              filtered.map(item => (
                <button
                  key={item.key}
                  type="button"
                  title={item.label}
                  onClick={() => { onValueChange(item.key); setOpen(false); setSearch(""); }}
                  className={`w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2`}
                >
                  {value === item.key
                    ? <CheckIcon className="size-3.5 shrink-0" />
                    : <span className="size-3.5 shrink-0" />}
                  <span className="min-w-0 truncate">{item.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Cascading version selector ──────────────────────────────────────────────

interface VersionSelectorProps {
  versions: Version[];
  selectedProject: string;
  onProjectChange: (p: string) => void;
  selectedDataset: string;
  onDatasetChange: (d: string) => void;
  selectedVersion: string;
  onVersionChange: (v: string) => void;
  disabled?: boolean;
}

function VersionSelector({
  versions,
  selectedProject,
  onProjectChange,
  selectedDataset,
  onDatasetChange,
  selectedVersion,
  onVersionChange,
  disabled,
}: VersionSelectorProps) {
  const projects = useMemo(() => {
    const seen = new Set<string>();
    return versions
      .filter(v => { if (seen.has(v.projectKey)) return false; seen.add(v.projectKey); return true; })
      .map(v => ({ key: v.projectKey, label: `${v.projectName} (${v.projectNameShort})` || v.projectKey, shortLabel: v.projectNameShort || v.projectKey }));
  }, [versions]);

  const datasets = useMemo(() => {
    if (!selectedProject) return [];
    const seen = new Set<string>();
    return versions
      .filter(v => v.projectKey === selectedProject)
      .filter(v => { if (seen.has(v.datasetKey)) return false; seen.add(v.datasetKey); return true; })
      .map(v => ({ key: v.datasetKey, label: `${v.datasetName} (${v.datasetNameShort})` || v.datasetKey, shortLabel: v.datasetNameShort || v.datasetKey }));
  }, [versions, selectedProject]);

  const versionItems = useMemo(() => {
    if (!selectedProject || !selectedDataset) return [];
    return versions.filter(v => v.projectKey === selectedProject && v.datasetKey === selectedDataset);
  }, [versions, selectedProject, selectedDataset]);

  return (
    <div className="space-y-2">
      {/* Step 1: Project */}
      <div className="flex items-center gap-3">
        <span className="w-5 h-5 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
        <div className="flex-1 min-w-0">
          <SearchableSelect
            value={selectedProject}
            onValueChange={p => { onProjectChange(p); onDatasetChange(""); onVersionChange(""); }}
            placeholder="Select a project…"
            items={projects}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Step 2: Dataset */}
      <div className="flex items-center gap-3">
        <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${selectedProject ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'}`}>2</span>
        <div className="flex-1 min-w-0">
          <SearchableSelect
            value={selectedDataset}
            onValueChange={d => { onDatasetChange(d); onVersionChange(""); }}
            placeholder={selectedProject ? "Select a dataset…" : "Select a project first"}
            items={datasets}
            disabled={disabled || !selectedProject}
          />
        </div>
      </div>

      {/* Step 3: Version */}
      <div className="flex items-center gap-3">
        <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${selectedDataset ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'}`}>3</span>
        <div className="flex-1 min-w-0">
          <SearchableSelect
            value={selectedVersion}
            onValueChange={onVersionChange}
            placeholder={selectedDataset ? "Select a version…" : "Select a dataset first"}
            items={versionItems.map(v => ({ key: v.versionKey, label: `${v.version}${v.versionName ? ` — ${v.versionName}` : ""}`, shortLabel: v.version }))}
            disabled={disabled || !selectedDataset}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

interface DownloadItem {
  title: string;
  description: string;
  onClick: () => void;
  disabled: boolean;
  admin: boolean;
  warning?: string;
  attention?: string;
  isEntries?: boolean;
  isEntities?: boolean;
  isGroupings?: boolean;
  isEntityNames?: boolean;
  isRScript?: boolean;
}

export default function DownloadsPage() {

  const { auth } = useAuth();

  // Version data
  const [versions, setVersions] = useState<Version[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [errorData, setErrorData] = useState<string | null>(null);


  // State for info card
  const [showInfo, setShowInfo] = useState(true);

  // Cascading selectors — entries
  const [selProject, setSelProject] = useState("");
  const [selDataset, setSelDataset] = useState("");
  const [selectedVersion, setSelectedVersion] = useState("");

  // Cascading selectors — R scripts
  const [selProjectR, setSelProjectR] = useState("");
  const [selDatasetR, setSelDatasetR] = useState("");
  const [selectedVersionR, setSelectedVersionR] = useState("");

  // Entry filters panel
  const [entryFilters, setEntryFilters] = useState<EntryFilters | null>(null);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [variableSearch, setVariableSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [shortFormat, setShortFormat] = useState(false);
  const [includeSpecialEntityLinks, setIncludeSpecialEntityLinks] = useState(false);

  // Entity filters panel
  const [entityFilters, setEntityFilters] = useState<GeoFilters | null>(null);
  const [loadingEntityFilters, setLoadingEntityFilters] = useState(false);
  const [entitySelectedRegions, setEntitySelectedRegions] = useState<string[]>([]);
  const [entitySelectedCountries, setEntitySelectedCountries] = useState<string[]>([]);
  const [entityCountrySearch, setEntityCountrySearch] = useState("");
  const [showEntityFilters, setShowEntityFilters] = useState(false);

  // Grouping filters panel
  const [groupingFilters, setGroupingFilters] = useState<GeoFilters | null>(null);
  const [loadingGroupingFilters, setLoadingGroupingFilters] = useState(false);
  const [groupingSelectedRegions, setGroupingSelectedRegions] = useState<string[]>([]);
  const [groupingSelectedCountries, setGroupingSelectedCountries] = useState<string[]>([]);
  const [groupingCountrySearch, setGroupingCountrySearch] = useState("");
  const [showGroupingFilters, setShowGroupingFilters] = useState(false);

  // Entity name filters panel
  const [entityNameFilters, setEntityNameFilters] = useState<GeoFilters | null>(null);
  const [loadingEntityNameFilters, setLoadingEntityNameFilters] = useState(false);
  const [entityNameSelectedRegions, setEntityNameSelectedRegions] = useState<string[]>([]);
  const [entityNameSelectedCountries, setEntityNameSelectedCountries] = useState<string[]>([]);
  const [entityNameCountrySearch, setEntityNameCountrySearch] = useState("");
  const [showEntityNameFilters, setShowEntityNameFilters] = useState(false);

  // ── Fetch entity filters once on mount ─────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingEntityFilters(true);
      fetch("/api/downloads/entities/filters", { credentials: "include" })
        .then(r => r.json())
        .then((data: GeoFilters) => { setEntityFilters(data); })
        .catch(() => setEntityFilters(null))
        .finally(() => setLoadingEntityFilters(false));
    };
    load();
  }, []);

  // ── Fetch grouping filters once on mount ────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingGroupingFilters(true);
      fetch("/api/downloads/groupings/filters", { credentials: "include" })
        .then(r => r.json())
        .then((data: GeoFilters) => { setGroupingFilters(data); })
        .catch(() => setGroupingFilters(null))
        .finally(() => setLoadingGroupingFilters(false));
    };
    load();
  }, []);

  // ── Fetch entity name filters once on mount ──────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingEntityNameFilters(true);
      fetch("/api/downloads/entity-names/filters", { credentials: "include" })
        .then(r => r.json())
        .then((data: GeoFilters) => { setEntityNameFilters(data); })
        .catch(() => setEntityNameFilters(null))
        .finally(() => setLoadingEntityNameFilters(false));
    };
    load();
  }, []);

  // ── Fetch versions ──────────────────────────────────────────────────────────
  useEffect(() => {
    const ac = new AbortController();
    const load = async () => {
      setLoadingData(true);
      setErrorData(null);
      fetch("/api/versions/", { credentials: "include", signal: ac.signal })
        .then(r => { if (!r.ok) throw new Error("Failed to fetch versions"); return r.json(); })
        .then((data: Version[]) => {
          const sorted = [...data].sort((a, b) => {
            const pa = a.projectNameShort || "", pb = b.projectNameShort || "";
            if (pa !== pb) return pa.localeCompare(pb);
            const da = a.datasetNameShort || "", db = b.datasetNameShort || "";
            if (da !== db) return da.localeCompare(db);
            return (a.version || "").localeCompare(b.version || "");
          });
          setVersions(sorted);
        })
        .catch(err => { if (err instanceof Error && err.name !== "AbortError") setErrorData(err instanceof Error ? err.message : "Failed to fetch data"); })
        .finally(() => { if (!ac.signal.aborted) setLoadingData(false); });
    };
    load();
    return () => ac.abort();
  }, []);

  // ── Fetch entry filters when version changes ────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!selectedVersion) {
        setEntryFilters(null);
        setSelectedRegions([]);
        setSelectedCountries([]);
        setYearFrom("");
        setYearTo("");
        setCountrySearch("");
        setShowFilters(false);
        return;
      }
      setLoadingFilters(true);
      fetch(`/api/downloads/entries/${selectedVersion}/filters`, { credentials: "include" })
        .then(r => r.json())
        .then((data: EntryFilters) => {
          if (!cancelled) {
            setEntryFilters(data);
            setSelectedRegions([]);
            setSelectedCountries([]);
            setSelectedVariables([]);
            setYearFrom(data.yearMin != null ? String(data.yearMin) : "");
            setYearTo(data.yearMax != null ? String(data.yearMax) : "");
            setCountrySearch("");
            setVariableSearch("");
          }
        })
        .catch(() => { if (!cancelled) setEntryFilters(null); })
        .finally(() => { if (!cancelled) setLoadingFilters(false); });
    };
    load();
    return () => { cancelled = true; };
  }, [selectedVersion]);

  // ── Derived: filtered country lists ────────────────────────────────────────
  const filteredCountries = useMemo(() => {
    if (!entryFilters) return [];
    let list = entryFilters.countries;
    if (selectedRegions.length > 0 && !countrySearch.trim()) {
      list = list.filter(c => c.region != null && selectedRegions.includes(c.region));
    }
    if (countrySearch.trim()) {
      const lower = countrySearch.toLowerCase();
      list = list.filter(c =>
        c.countryname.toLowerCase().includes(lower) ||
        c.countrycodePolpal.toLowerCase().includes(lower)
      );
    }
    return list;
  }, [entryFilters, selectedRegions, countrySearch]);

  const filteredVariables = useMemo(() => {
    if (!entryFilters) return [];
    const lower = variableSearch.toLowerCase().trim();
    if (!lower) return entryFilters.variables;
    return entryFilters.variables.filter(v => v.toLowerCase().includes(lower));
  }, [entryFilters, variableSearch]);

  const filteredEntityCountries = useMemo(() => {
    if (!entityFilters) return [];
    let list = entityFilters.countries;
    if (entitySelectedRegions.length > 0 && !entityCountrySearch.trim()) {
      list = list.filter(c => c.region != null && entitySelectedRegions.includes(c.region));
    }
    if (entityCountrySearch.trim()) {
      const lower = entityCountrySearch.toLowerCase();
      list = list.filter(c =>
        c.countryname.toLowerCase().includes(lower) ||
        c.countrycodePolpal.toLowerCase().includes(lower)
      );
    }
    return list;
  }, [entityFilters, entitySelectedRegions, entityCountrySearch]);

  const filteredGroupingCountries = useMemo(() => {
    if (!groupingFilters) return [];
    let list = groupingFilters.countries;
    if (groupingSelectedRegions.length > 0 && !groupingCountrySearch.trim()) {
      list = list.filter(c => c.region != null && groupingSelectedRegions.includes(c.region));
    }
    if (groupingCountrySearch.trim()) {
      const lower = groupingCountrySearch.toLowerCase();
      list = list.filter(c =>
        c.countryname.toLowerCase().includes(lower) ||
        c.countrycodePolpal.toLowerCase().includes(lower)
      );
    }
    return list;
  }, [groupingFilters, groupingSelectedRegions, groupingCountrySearch]);

  const filteredEntityNameCountries = useMemo(() => {
    if (!entityNameFilters) return [];
    let list = entityNameFilters.countries;
    if (entityNameSelectedRegions.length > 0 && !entityNameCountrySearch.trim()) {
      list = list.filter(c => c.region != null && entityNameSelectedRegions.includes(c.region));
    }
    if (entityNameCountrySearch.trim()) {
      const lower = entityNameCountrySearch.toLowerCase();
      list = list.filter(c =>
        c.countryname.toLowerCase().includes(lower) ||
        c.countrycodePolpal.toLowerCase().includes(lower)
      );
    }
    return list;
  }, [entityNameFilters, entityNameSelectedRegions, entityNameCountrySearch]);

  // ── Toggle helpers ──────────────────────────────────────────────────────────
  function toggleRegion(r: string) {
    setSelectedRegions(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
    setSelectedCountries([]);
  }

  function toggleCountry(code: string) {
    setSelectedCountries(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  }

  function selectAllCountries() {
    setSelectedCountries(filteredCountries.map(c => c.countrycodePolpal));
  }

  function clearAllCountries() {
    setSelectedCountries([]);
  }

  function toggleVariable(v: string) {
    setSelectedVariables(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  }

  function selectAllVariables() {
    setSelectedVariables(filteredVariables);
  }

  function clearAllVariables() {
    setSelectedVariables([]);
  }

  function toggleEntityRegion(r: string) {
    setEntitySelectedRegions(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
    setEntitySelectedCountries([]);
  }

  function toggleEntityCountry(code: string) {
    setEntitySelectedCountries(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  }

  function selectAllEntityCountries() {
    setEntitySelectedCountries(filteredEntityCountries.map(c => c.countrycodePolpal));
  }

  function clearAllEntityCountries() {
    setEntitySelectedCountries([]);
  }

  function toggleGroupingRegion(r: string) {
    setGroupingSelectedRegions(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
    setGroupingSelectedCountries([]);
  }

  function toggleGroupingCountry(code: string) {
    setGroupingSelectedCountries(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  }

  function selectAllGroupingCountries() {
    setGroupingSelectedCountries(filteredGroupingCountries.map(c => c.countrycodePolpal));
  }

  function clearAllGroupingCountries() {
    setGroupingSelectedCountries([]);
  }

  function toggleEntityNameRegion(r: string) {
    setEntityNameSelectedRegions(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
    setEntityNameSelectedCountries([]);
  }

  function toggleEntityNameCountry(code: string) {
    setEntityNameSelectedCountries(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  }

  function selectAllEntityNameCountries() {
    setEntityNameSelectedCountries(filteredEntityNameCountries.map(c => c.countrycodePolpal));
  }

  function clearAllEntityNameCountries() {
    setEntityNameSelectedCountries([]);
  }

  // ── Download handlers ───────────────────────────────────────────────────────
  function downloadCountriesCsvStream() { startDownload(`/api/downloads/countries/stream`); }
  function downloadEntitiesCsvStream() {
    const params = new URLSearchParams();
    if (entitySelectedCountries.length > 0) {
      params.set("countries", entitySelectedCountries.join(","));
    } else if (entitySelectedRegions.length > 0) {
      params.set("regions", entitySelectedRegions.join(","));
    }
    const qs = params.toString();
    startDownload(`/api/downloads/entities/stream${qs ? `?${qs}` : ""}`);
  }
  function downloadGroupingsCsvStream() {
    const params = new URLSearchParams();
    if (groupingSelectedCountries.length > 0) {
      params.set("countries", groupingSelectedCountries.join(","));
    } else if (groupingSelectedRegions.length > 0) {
      params.set("regions", groupingSelectedRegions.join(","));
    }
    const qs = params.toString();
    startDownload(`/api/downloads/groupings/stream${qs ? `?${qs}` : ""}`);
  }

  function downloadEntityNamesCsvStream() {
    const params = new URLSearchParams();
    if (entityNameSelectedCountries.length > 0) {
      params.set("countries", entityNameSelectedCountries.join(","));
    } else if (entityNameSelectedRegions.length > 0) {
      params.set("regions", entityNameSelectedRegions.join(","));
    }
    const qs = params.toString();
    startDownload(`/api/downloads/entity-names/stream${qs ? `?${qs}` : ""}`);
  }

  function downloadEntriesCsvStream() {
    if (!selectedVersion) { alert("Please select a version first."); return; }
    const params = new URLSearchParams();
    if (selectedCountries.length > 0) {
      params.set("countries", selectedCountries.join(","));
    } else if (selectedRegions.length > 0) {
      params.set("regions", selectedRegions.join(","));
    }
    const yFrom = yearFrom ? parseInt(yearFrom, 10) : NaN;
    const yTo = yearTo ? parseInt(yearTo, 10) : NaN;
    if (!isNaN(yFrom)) params.set("yearFrom", String(yFrom));
    if (!isNaN(yTo)) params.set("yearTo", String(yTo));
    if (selectedVariables.length > 0) {
      params.set("variables", selectedVariables.join(","));
    }
    if (shortFormat) params.set("short", "true");
    if (!includeSpecialEntityLinks) params.set("includeSpecialEntityLinks", "false");
    const qs = params.toString();
    startDownload(`/api/downloads/entries/${selectedVersion}/stream${qs ? `?${qs}` : ""}`);
  }

  function downloadRScripts() {
    if (!selectedVersionR) { alert("Please select a version first."); return; }
    fetch('/api/downloads/scripts/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptName: selectedVersionR }),
    }).catch(() => { });
    const a = document.createElement("a");
    a.href = `/Rscripts/${selectedVersionR}.R`;
    a.download = `polpal_import_${selectedVersionR}.R`;
    a.click();
  }

  // ── Active filter badge texts ───────────────────────────────────────────────
  const filterBadge = useMemo(() => {
    const parts: string[] = [];
    if (selectedCountries.length > 0)
      parts.push(`${selectedCountries.length} countr${selectedCountries.length === 1 ? "y" : "ies"}`);
    else if (selectedRegions.length > 0)
      parts.push(`${selectedRegions.length} region${selectedRegions.length === 1 ? "" : "s"}`);
    if (yearFrom || yearTo) parts.push(`${yearFrom || "\u2026"}\u2013${yearTo || "\u2026"}`);
    if (selectedVariables.length > 0)
      parts.push(`${selectedVariables.length} var${selectedVariables.length === 1 ? "" : "s"}`);
    return parts.join(", ");
  }, [selectedCountries, selectedRegions, yearFrom, yearTo, selectedVariables]);

  const entityFilterBadge = useMemo(() => {
    if (entitySelectedCountries.length > 0)
      return `${entitySelectedCountries.length} countr${entitySelectedCountries.length === 1 ? "y" : "ies"}`;
    if (entitySelectedRegions.length > 0)
      return `${entitySelectedRegions.length} region${entitySelectedRegions.length === 1 ? "" : "s"}`;
    return "";
  }, [entitySelectedCountries, entitySelectedRegions]);

  const groupingFilterBadge = useMemo(() => {
    if (groupingSelectedCountries.length > 0)
      return `${groupingSelectedCountries.length} countr${groupingSelectedCountries.length === 1 ? "y" : "ies"}`;
    if (groupingSelectedRegions.length > 0)
      return `${groupingSelectedRegions.length} region${groupingSelectedRegions.length === 1 ? "" : "s"}`;
    return "";
  }, [groupingSelectedCountries, groupingSelectedRegions]);

  const entityNameFilterBadge = useMemo(() => {
    if (entityNameSelectedCountries.length > 0)
      return `${entityNameSelectedCountries.length} countr${entityNameSelectedCountries.length === 1 ? "y" : "ies"}`;
    if (entityNameSelectedRegions.length > 0)
      return `${entityNameSelectedRegions.length} region${entityNameSelectedRegions.length === 1 ? "" : "s"}`;
    return "";
  }, [entityNameSelectedCountries, entityNameSelectedRegions]);

  // ── Downloads list ──────────────────────────────────────────────────────────
  const downloads: DownloadItem[] = [
    {
      title: "PolPaL Linkages of External Data",
      description: "Linkages and related metadata for the selected dataset version.",
      warning: "The external data are linked gradually and may be incomplete for some dataset versions.",
      onClick: downloadEntriesCsvStream,
      disabled: !selectedVersion || loadingData,
      admin: false,
      isEntries: true,
    },
    {
      title: "PolPaL Entities",
      description: "Full list of all PolPaL entities (parties & groupings).",
      warning: "The PolPaL entities are curated gradually and information may be incomplete for some countries.",
      onClick: downloadEntitiesCsvStream,
      disabled: false,
      admin: false,
      isEntities: true,
    },
    {
      title: "PolPaL Groupings with Members",
      description: "Full list of all PolPaL entity groupings with their members.",
      warning: "The information is added gradually and may be incomplete for some entities.",
      onClick: downloadGroupingsCsvStream,
      disabled: false,
      admin: false,
      isGroupings: true,
    },
    {
      title: "PolPaL Entity Names",
      description: "All alternative names for PolPaL entities with language and time information.",
      warning: "The information is added gradually and may be incomplete for some entities.",
      onClick: downloadEntityNamesCsvStream,
      disabled: false,
      admin: false,
      isEntityNames: true,
    },
    {
      title: "R Scripts for Importing External Data",
      description: "R scripts for importing external data into PolPaL.",
      onClick: downloadRScripts,
      disabled: !selectedVersionR || loadingData,
      admin: false,
      isRScript: true,
    },
    {
      title: "PolPaL Countries and Territories",
      description: "Full list of PolPaL countries and territories.",
      onClick: downloadCountriesCsvStream,
      disabled: false,
      admin: false,
    },
    {
      title: "Projects, Datasets & Versions Overview",
      description: "Overview of all available projects, datasets, and versions.",
      onClick: () => { startDownload('/api/downloads/versions-overview/stream'); },
      disabled: false,
      admin: false,
    },
  ];

  const filteredDownloads = downloads.filter(dl => !dl.admin || auth.role === "ADMIN");

  if (loadingData)
    return <LoadingSpinner title="Loading data..." message="Fetching data. Please wait a moment." />;
  if (errorData)
    return <ErrorState message="We encountered an issue while loading data." error={errorData} />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Download" }]} />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Download</h1>
        <p className="mt-2 text-sm text-gray-700">
          Download the latest PolPaL data
        </p>
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
            <h2 className="text-xl font-bold text-gray-800">Information</h2>
          </div>
          {showInfo ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
        </button>
        {showInfo && <div className="px-6 pb-6">
          <p className="text-gray-700 mb-4 leading-relaxed text-justify">
            Welcome to the PolPaL download page!
            Here you can download the PolPaL entities, groupings, entity names, and linkages of external data.
          </p>
          <div className="space-y-4 rounded-lg border border-blue-100 bg-blue-50/60 p-4 text-gray-700">
            <h3 className="text-lg font-semibold text-gray-800">Please cite as follows</h3>
            <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
              <section className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <h4 className="text-sm font-semibold text-gray-800">For the PolPaL data</h4>
                  <blockquote className="border-l-2 border-blue-300 pl-4 text-sm leading-relaxed italic">
                    Bederke, P., &amp; Kaftan, L. (2026). PolPaL - Political Party Links ([DATE]) [DATASET]. https://polpal.org.
                  </blockquote>
                  <p className="text-xs leading-relaxed text-gray-600">
                    Replace <span className="font-medium">[DATASET]</span> with the selected dataset and <span className="font-medium">[DATE]</span> with the download date.
                  </p>
                  <blockquote className="border-l-2 border-blue-300 pl-4 text-sm leading-relaxed italic">
                    Citation for PolPaL introductory article forthcoming.
                  </blockquote>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:w-36 sm:justify-end">
                  <span className="text-xs font-semibold text-gray-600">License</span>
                  <a className="text-sm font-medium text-primary underline" href="https://opendatacommons.org/licenses/by/1-0/" target="_blank" rel="noreferrer">ODC-By</a>
                </div>
              </section>
              <section className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <h4 className="text-sm font-semibold text-gray-800">For the stable version</h4>
                  <blockquote className="border-l-2 border-blue-300 pl-4 text-sm leading-relaxed italic">
                    Citation for the PolPaL stable version forthcoming.
                  </blockquote>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:w-36 sm:justify-end">
                  <span className="text-xs font-semibold text-gray-600">License</span>
                  <a className="text-sm font-medium text-primary underline" href="https://opendatacommons.org/licenses/by/1-0/" target="_blank" rel="noreferrer">ODC-By</a>
                </div>
              </section>
              <section className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <h4 className="text-sm font-semibold text-gray-800">For the PolPaL software code</h4>
                  <blockquote className="border-l-2 border-blue-300 pl-4 text-sm leading-relaxed italic">
                    Citation for the PolPaL software code forthcoming.
                  </blockquote>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:w-36 sm:justify-end">
                  <span className="text-xs font-semibold text-gray-600">License</span>
                  <a className="text-sm font-medium text-primary underline" href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noreferrer">AGPL-3.0-only</a>
                </div>
              </section>
            </div>
          </div>
        </div>}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 divide-y divide-gray-200 bg-white shadow-sm">
        {filteredDownloads.map((dl) => (
          <div
            key={dl.title}
            className="flex flex-col sm:flex-row items-start justify-between px-6 py-5 gap-6 transition hover:bg-gray-50"
          >
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-medium text-gray-900">{dl.title}</h2>
              <p className="mt-1 text-sm text-gray-600">{dl.description}</p>

              {dl.warning && (
                <p className="mt-2 text-sm text-amber-700 bg-amber-50 border-l-4 border-l-amber-200 rounded-md px-3 py-2 w-fit">{dl.warning}</p>
              )}
              {dl.attention && (
                <p className="mt-2 text-sm text-red-700 bg-red-50 border-l-4 border-l-red-200 rounded-md px-3 py-2 w-fit">{dl.attention}</p>
              )}

              {/* ── Entity geo filters ── */}
              {dl.isEntities && (
                <div className="mt-4 max-w-xl">
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowEntityFilters(v => !v)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
                    >
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                        </svg>
                        Filters (optional)
                        {entityFilterBadge && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary text-white">
                            {entityFilterBadge}
                          </span>
                        )}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${showEntityFilters ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showEntityFilters && (
                      <div className="p-4 space-y-5 bg-white">
                        {loadingEntityFilters ? (
                          <p className="text-sm text-gray-500">Loading available filters…</p>
                        ) : entityFilters ? (
                          <>
                            {/* Region filter */}
                            {entityFilters.regions.length > 0 && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium text-gray-700">
                                    Region
                                    <span className="ml-1 text-xs text-gray-400 font-normal">
                                      ({entitySelectedRegions.length === 0 ? "all" : `${entitySelectedRegions.length} selected`})
                                    </span>
                                  </label>
                                  {entitySelectedRegions.length > 0 && (
                                    <button type="button" onClick={() => { setEntitySelectedRegions([]); setEntitySelectedCountries([]); }} className="text-xs text-gray-500 hover:underline">
                                      Clear
                                    </button>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {entityFilters.regions.map(r => (
                                    <button
                                      key={r}
                                      type="button"
                                      onClick={() => toggleEntityRegion(r)}
                                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${entitySelectedRegions.includes(r)
                                        ? "bg-primary text-white border-primary"
                                        : "bg-white text-gray-600 border-gray-300 hover:border-primary hover:text-primary"
                                        }`}
                                    >
                                      {r}
                                    </button>
                                  ))}
                                </div>
                                {entitySelectedRegions.length > 0 && entitySelectedCountries.length > 0 && (
                                  <p className="mt-2 text-xs text-amber-600">Country selection overrides region filter in the download.</p>
                                )}
                              </div>
                            )}

                            {/* Country filter */}
                            {entityFilters.countries.length > 0 && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium text-gray-700">
                                    Countries
                                    <span className="ml-1 text-xs text-gray-400 font-normal">
                                      ({entitySelectedCountries.length === 0 ? "all" : `${entitySelectedCountries.length} of ${entityFilters.countries.length} selected`})
                                    </span>
                                  </label>
                                  <div className="flex gap-2 text-xs">
                                    <button type="button" onClick={selectAllEntityCountries} className="text-primary hover:underline">All</button>
                                    <span className="text-gray-300">·</span>
                                    <button type="button" onClick={clearAllEntityCountries} className="text-gray-500 hover:underline">None</button>
                                  </div>
                                </div>
                                <Input
                                  type="text"
                                  placeholder={entitySelectedRegions.length > 0 ? "Search within selected regions…" : "Search countries…"}
                                  value={entityCountrySearch}
                                  onChange={e => setEntityCountrySearch(e.target.value)}
                                  className="mb-2 w-full"
                                />
                                <div className="border border-gray-200 rounded-md max-h-52 overflow-y-auto text-sm">
                                  {filteredEntityCountries.length === 0 ? (
                                    <p className="px-3 py-3 text-gray-400 text-xs text-center">No countries match</p>
                                  ) : (
                                    filteredEntityCountries.map(c => (
                                      <label
                                        key={c.countrycodePolpal}
                                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={entitySelectedCountries.includes(c.countrycodePolpal)}
                                          onChange={() => toggleEntityCountry(c.countrycodePolpal)}
                                          className="accent-primary"
                                        />
                                        <CountryFlag iso2c={c.iso2c} countrycodePolpal={c.countrycodePolpal} countryname={c.countryname} size={20} />
                                        <span className="text-gray-800">{c.countryname}</span>
                                        <span className="hidden sm:inline text-gray-400 text-xs ml-auto w-16 shrink-0">{c.countrycodePolpal}</span>
                                      </label>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-gray-400 italic">No filter data available.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Grouping geo filters ── */}
              {dl.isGroupings && (
                <div className="mt-4 max-w-xl">
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowGroupingFilters(v => !v)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
                    >
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                        </svg>
                        Filters (optional)
                        {groupingFilterBadge && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary text-white">
                            {groupingFilterBadge}
                          </span>
                        )}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${showGroupingFilters ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showGroupingFilters && (
                      <div className="p-4 space-y-5 bg-white">
                        {loadingGroupingFilters ? (
                          <p className="text-sm text-gray-500">Loading available filters…</p>
                        ) : groupingFilters ? (
                          <>
                            {/* Region filter */}
                            {groupingFilters.regions.length > 0 && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium text-gray-700">
                                    Region
                                    <span className="ml-1 text-xs text-gray-400 font-normal">
                                      ({groupingSelectedRegions.length === 0 ? "all" : `${groupingSelectedRegions.length} selected`})
                                    </span>
                                  </label>
                                  {groupingSelectedRegions.length > 0 && (
                                    <button type="button" onClick={() => { setGroupingSelectedRegions([]); setGroupingSelectedCountries([]); }} className="text-xs text-gray-500 hover:underline">
                                      Clear
                                    </button>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {groupingFilters.regions.map(r => (
                                    <button
                                      key={r}
                                      type="button"
                                      onClick={() => toggleGroupingRegion(r)}
                                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${groupingSelectedRegions.includes(r)
                                        ? "bg-primary text-white border-primary"
                                        : "bg-white text-gray-600 border-gray-300 hover:border-primary hover:text-primary"
                                        }`}
                                    >
                                      {r}
                                    </button>
                                  ))}
                                </div>
                                {groupingSelectedRegions.length > 0 && groupingSelectedCountries.length > 0 && (
                                  <p className="mt-2 text-xs text-amber-600">Country selection overrides region filter in the download.</p>
                                )}
                              </div>
                            )}

                            {/* Country filter */}
                            {groupingFilters.countries.length > 0 && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium text-gray-700">
                                    Countries
                                    <span className="ml-1 text-xs text-gray-400 font-normal">
                                      ({groupingSelectedCountries.length === 0 ? "all" : `${groupingSelectedCountries.length} of ${groupingFilters.countries.length} selected`})
                                    </span>
                                  </label>
                                  <div className="flex gap-2 text-xs">
                                    <button type="button" onClick={selectAllGroupingCountries} className="text-primary hover:underline">All</button>
                                    <span className="text-gray-300">·</span>
                                    <button type="button" onClick={clearAllGroupingCountries} className="text-gray-500 hover:underline">None</button>
                                  </div>
                                </div>
                                <Input
                                  type="text"
                                  placeholder={groupingSelectedRegions.length > 0 ? "Search within selected regions…" : "Search countries…"}
                                  value={groupingCountrySearch}
                                  onChange={e => setGroupingCountrySearch(e.target.value)}
                                  className="mb-2 w-full"
                                />
                                <div className="border border-gray-200 rounded-md max-h-52 overflow-y-auto text-sm">
                                  {filteredGroupingCountries.length === 0 ? (
                                    <p className="px-3 py-3 text-gray-400 text-xs text-center">No countries match</p>
                                  ) : (
                                    filteredGroupingCountries.map(c => (
                                      <label
                                        key={c.countrycodePolpal}
                                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={groupingSelectedCountries.includes(c.countrycodePolpal)}
                                          onChange={() => toggleGroupingCountry(c.countrycodePolpal)}
                                          className="accent-primary"
                                        />
                                        <CountryFlag iso2c={c.iso2c} countrycodePolpal={c.countrycodePolpal} countryname={c.countryname} size={20} />
                                        <span className="text-gray-800">{c.countryname}</span>
                                        <span className="hidden sm:inline text-gray-400 text-xs ml-auto shrink-0">{c.countrycodePolpal}</span>
                                      </label>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-gray-400 italic">No filter data available.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Entity name geo filters ── */}
              {dl.isEntityNames && (
                <div className="mt-4 max-w-xl">
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowEntityNameFilters(v => !v)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
                    >
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                        </svg>
                        Filters (optional)
                        {entityNameFilterBadge && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary text-white">
                            {entityNameFilterBadge}
                          </span>
                        )}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${showEntityNameFilters ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showEntityNameFilters && (
                      <div className="p-4 space-y-5 bg-white">
                        {loadingEntityNameFilters ? (
                          <p className="text-sm text-gray-500">Loading available filters…</p>
                        ) : entityNameFilters ? (
                          <>
                            {/* Region filter */}
                            {entityNameFilters.regions.length > 0 && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium text-gray-700">
                                    Region
                                    <span className="ml-1 text-xs text-gray-400 font-normal">
                                      ({entityNameSelectedRegions.length === 0 ? "all" : `${entityNameSelectedRegions.length} selected`})
                                    </span>
                                  </label>
                                  {entityNameSelectedRegions.length > 0 && (
                                    <button type="button" onClick={() => { setEntityNameSelectedRegions([]); setEntityNameSelectedCountries([]); }} className="text-xs text-gray-500 hover:underline">
                                      Clear
                                    </button>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {entityNameFilters.regions.map(r => (
                                    <button
                                      key={r}
                                      type="button"
                                      onClick={() => toggleEntityNameRegion(r)}
                                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${entityNameSelectedRegions.includes(r)
                                        ? "bg-primary text-white border-primary"
                                        : "bg-white text-gray-600 border-gray-300 hover:border-primary hover:text-primary"
                                        }`}
                                    >
                                      {r}
                                    </button>
                                  ))}
                                </div>
                                {entityNameSelectedRegions.length > 0 && entityNameSelectedCountries.length > 0 && (
                                  <p className="mt-2 text-xs text-amber-600">Country selection overrides region filter in the download.</p>
                                )}
                              </div>
                            )}

                            {/* Country filter */}
                            {entityNameFilters.countries.length > 0 && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium text-gray-700">
                                    Countries
                                    <span className="ml-1 text-xs text-gray-400 font-normal">
                                      ({entityNameSelectedCountries.length === 0 ? "all" : `${entityNameSelectedCountries.length} of ${entityNameFilters.countries.length} selected`})
                                    </span>
                                  </label>
                                  <div className="flex gap-2 text-xs">
                                    <button type="button" onClick={selectAllEntityNameCountries} className="text-primary hover:underline">All</button>
                                    <span className="text-gray-300">·</span>
                                    <button type="button" onClick={clearAllEntityNameCountries} className="text-gray-500 hover:underline">None</button>
                                  </div>
                                </div>
                                <Input
                                  type="text"
                                  placeholder={entityNameSelectedRegions.length > 0 ? "Search within selected regions…" : "Search countries…"}
                                  value={entityNameCountrySearch}
                                  onChange={e => setEntityNameCountrySearch(e.target.value)}
                                  className="mb-2 w-full"
                                />
                                <div className="border border-gray-200 rounded-md max-h-52 overflow-y-auto text-sm">
                                  {filteredEntityNameCountries.length === 0 ? (
                                    <p className="px-3 py-3 text-gray-400 text-xs text-center">No countries match</p>
                                  ) : (
                                    filteredEntityNameCountries.map(c => (
                                      <label
                                        key={c.countrycodePolpal}
                                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={entityNameSelectedCountries.includes(c.countrycodePolpal)}
                                          onChange={() => toggleEntityNameCountry(c.countrycodePolpal)}
                                          className="accent-primary"
                                        />
                                        <CountryFlag iso2c={c.iso2c} countrycodePolpal={c.countrycodePolpal} countryname={c.countryname} size={20} />
                                        <span className="text-gray-800">{c.countryname}</span>
                                        <span className="hidden sm:inline text-gray-400 text-xs ml-auto w-16 shrink-0">{c.countrycodePolpal}</span>
                                      </label>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-gray-400 italic">No filter data available.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── R script version selector ── */}
              {dl.isRScript && (
                <div className="mt-4 max-w-md">
                  <p className="text-sm font-medium text-gray-700 mb-3">Select version:</p>
                  <VersionSelector
                    versions={versions}
                    selectedProject={selProjectR}
                    onProjectChange={setSelProjectR}
                    selectedDataset={selDatasetR}
                    onDatasetChange={setSelDatasetR}
                    selectedVersion={selectedVersionR}
                    onVersionChange={setSelectedVersionR}
                    disabled={loadingData}
                  />
                </div>
              )}

              {/* ── Entries version selector + filters ── */}
              {dl.isEntries && (
                <div className="mt-4 space-y-4">
                  <div className="max-w-md">
                    <p className="text-sm font-medium text-gray-700 mb-3">Select version:</p>
                    <VersionSelector
                      versions={versions}
                      selectedProject={selProject}
                      onProjectChange={setSelProject}
                      selectedDataset={selDataset}
                      onDatasetChange={setSelDataset}
                      selectedVersion={selectedVersion}
                      onVersionChange={setSelectedVersion}
                      disabled={loadingData}
                    />
                  </div>

                  {/* Filters panel */}
                  {selectedVersion && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden max-w-xl">
                      <button
                        type="button"
                        onClick={() => setShowFilters(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
                      >
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                          </svg>
                          Filters (optional)
                          {filterBadge && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary text-white">
                              {filterBadge}
                            </span>
                          )}
                        </span>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${showFilters ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {showFilters && (
                        <div className="p-4 space-y-5 bg-white">
                          {loadingFilters ? (
                            <p className="text-sm text-gray-500">Loading available filters…</p>
                          ) : entryFilters ? (
                            <>

                              {/* Short format toggle */}
                              <label className="text-sm font-medium text-gray-700">
                                Short Format
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                                <input
                                  type="checkbox"
                                  checked={shortFormat}
                                  onChange={e => setShortFormat(e.target.checked)}
                                  className="accent-primary"
                                />
                                <span className="text-xs text-gray-400 font-normal">Exclude version metadata and *Var columns</span>
                              </label>

                              {/* Special entity types filter */}
                              <label className="text-sm font-medium text-gray-700">
                                Include catch-all entities
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                                <input
                                  type="checkbox"
                                  checked={includeSpecialEntityLinks}
                                  onChange={e => setIncludeSpecialEntityLinks(e.target.checked)}
                                  className="accent-primary"
                                />
                                <span className="text-xs text-gray-400 font-normal">Include PolPaL ID for entity types UNKNOWN, RESIDUAL, OTHERS, INDEPENDENT</span>
                              </label>

                              {/* Year range */}
                              {(entryFilters.yearMin != null || entryFilters.yearMax != null) && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Year Range
                                    {entryFilters.yearMin != null && entryFilters.yearMax != null && (
                                      <span className="ml-1 text-xs text-gray-400 font-normal">
                                        (available: {entryFilters.yearMin}–{entryFilters.yearMax})
                                      </span>
                                    )}
                                  </label>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Input
                                      type="number"
                                      placeholder={entryFilters.yearMin != null ? String(entryFilters.yearMin) : "From"}
                                      value={yearFrom}
                                      onChange={e => setYearFrom(e.target.value)}
                                      className="w-28"
                                    />
                                    <span className="text-gray-400 text-sm">–</span>
                                    <Input
                                      type="number"
                                      placeholder={entryFilters.yearMax != null ? String(entryFilters.yearMax) : "To"}
                                      value={yearTo}
                                      onChange={e => setYearTo(e.target.value)}
                                      className="w-28"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setYearFrom(entryFilters.yearMin != null ? String(entryFilters.yearMin) : "");
                                        setYearTo(entryFilters.yearMax != null ? String(entryFilters.yearMax) : "");
                                      }}
                                      className="text-xs text-gray-500 hover:text-gray-700 underline"
                                    >
                                      Reset
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Region filter */}
                              {entryFilters.regions.length > 0 && (
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-gray-700">
                                      Region
                                      <span className="ml-1 text-xs text-gray-400 font-normal">
                                        ({selectedRegions.length === 0 ? "all" : `${selectedRegions.length} selected`})
                                      </span>
                                    </label>
                                    {selectedRegions.length > 0 && (
                                      <button type="button" onClick={() => { setSelectedRegions([]); setSelectedCountries([]); }} className="text-xs text-gray-500 hover:underline">
                                        Clear
                                      </button>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {entryFilters.regions.map(r => (
                                      <button
                                        key={r}
                                        type="button"
                                        onClick={() => toggleRegion(r)}
                                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${selectedRegions.includes(r)
                                          ? "bg-primary text-white border-primary"
                                          : "bg-white text-gray-600 border-gray-300 hover:border-primary hover:text-primary"
                                          }`}
                                      >
                                        {r}
                                      </button>
                                    ))}
                                  </div>
                                  {selectedRegions.length > 0 && selectedCountries.length > 0 && (
                                    <p className="mt-2 text-xs text-amber-600">Country selection overrides region filter in the download.</p>
                                  )}
                                </div>
                              )}

                              {/* Country filter */}
                              {entryFilters.countries.length > 0 && (
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-gray-700">
                                      Countries
                                      <span className="ml-1 text-xs text-gray-400 font-normal">
                                        ({selectedCountries.length === 0 ? "all" : `${selectedCountries.length} of ${entryFilters.countries.length} selected`})
                                      </span>
                                    </label>
                                    <div className="flex gap-2 text-xs">
                                      <button type="button" onClick={selectAllCountries} className="text-primary hover:underline">All</button>
                                      <span className="text-gray-300">·</span>
                                      <button type="button" onClick={clearAllCountries} className="text-gray-500 hover:underline">None</button>
                                    </div>
                                  </div>
                                  <Input
                                    type="text"
                                    placeholder={selectedRegions.length > 0 ? "Search within selected regions…" : "Search countries…"}
                                    value={countrySearch}
                                    onChange={e => setCountrySearch(e.target.value)}
                                    className="mb-2 w-full"
                                  />
                                  <div className="border border-gray-200 rounded-md max-h-52 overflow-y-auto text-sm">
                                    {filteredCountries.length === 0 ? (
                                      <p className="px-3 py-3 text-gray-400 text-xs text-center">No countries match</p>
                                    ) : (
                                      filteredCountries.map(c => (
                                        <label
                                          key={c.countrycodePolpal}
                                          className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={selectedCountries.includes(c.countrycodePolpal)}
                                            onChange={() => toggleCountry(c.countrycodePolpal)}
                                            className="accent-primary"
                                          />
                                          <CountryFlag iso2c={c.iso2c} countrycodePolpal={c.countrycodePolpal} countryname={c.countryname} size={20} />
                                          <span className="text-gray-800">{c.countryname}</span>
                                          <span className="hidden sm:inline text-gray-400 text-xs ml-auto w-16 shrink-0">{c.countrycodePolpal}</span>
                                        </label>
                                      ))
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Variable (entryEntityIdVar) filter */}
                              {entryFilters.variables.length > 0 && (
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-gray-700">
                                      Variable
                                      <span className="ml-1 text-xs text-gray-400 font-normal">
                                        ({selectedVariables.length === 0 ? "all" : `${selectedVariables.length} of ${entryFilters.variables.length} selected`})
                                      </span>
                                    </label>
                                    <div className="flex gap-2 text-xs">
                                      <button type="button" onClick={selectAllVariables} className="text-primary hover:underline">All</button>
                                      <span className="text-gray-300">·</span>
                                      <button type="button" onClick={clearAllVariables} className="text-gray-500 hover:underline">None</button>
                                    </div>
                                  </div>
                                  <Input
                                    type="text"
                                    placeholder="Search variables…"
                                    value={variableSearch}
                                    onChange={e => setVariableSearch(e.target.value)}
                                    className="mb-2 w-full"
                                  />
                                  <div className="border border-gray-200 rounded-md max-h-52 overflow-y-auto text-sm">
                                    {filteredVariables.length === 0 ? (
                                      <p className="px-3 py-3 text-gray-400 text-xs text-center">No variables match</p>
                                    ) : (
                                      filteredVariables.map(v => (
                                        <label
                                          key={v}
                                          className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={selectedVariables.includes(v)}
                                            onChange={() => toggleVariable(v)}
                                            className="accent-primary"
                                          />
                                          <span className="text-gray-800 font-mono text-xs">{v}</span>
                                        </label>
                                      ))
                                    )}
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-gray-400 italic">No filter data available for this version.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="sm:pt-1 flex-shrink-0">
              <ButtonDownload
                onClick={dl.onClick}
                ariaLabel={`Download ${dl.title}`}
                text="Download"
                disabled={dl.disabled}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
