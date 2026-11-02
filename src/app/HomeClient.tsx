"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { HomepageFigure } from "@/components/ui/HomepageFigure";
import type { EntityYearItem } from "@/components/ui/HomepageFigure";
import SearchInput from "@/components/ui/SearchInput";
import { ButtonAdd } from "@/components/ui/Buttons";
import { ExternalLink, TrendingUp } from "lucide-react";

/** Remove text duplicated by Commons (e.g. "Unknown author Unknown author" → "Unknown author"). */
const dedup = (s: string) => s.replace(/^(.+?) ?\1$/, '$1');

type Datasets = {
  projectIsHidden: boolean;
  projectKey: string;
  projectNameShort: string;
  projectName: string;
  datasetIsHidden: boolean;
  datasetKey: string;
  datasetNameShort: string;
  datasetName: string;

};

interface News {
  newsId: number;
  title: string;
  content: string;
  links: string[] | null;
  publishedPublicAt: string;
  updatedPublicAt: string | null;
}

type LogoEntity = {
  polpalId: number;
  nameShort: string;
  nameEnglish: string;
  wikidataId: string;
  logoUrl: string;
  attribution: { artist: string; credit: string; license: string; filePageUrl: string; restrictions: string } | null;
};

type ColorEntity = {
  polpalId: number;
  nameShort: string;
  nameEnglish: string;
  color: string;
};

type Statistics = {
  countriesCount: number;
  allCount: number;
  partiesCount: number;
  groupingsCount: number;
  projectsCount: number;
  datasetsCount: number;
  versionsCount: number;
  entriesCount: number;
  linksCount: number;
  totalProjectsCount: number;
  totalDatasetsCount: number;
  totalVersionsCount: number;
  totalEntriesCount: number;
};

/**
 * Home page component for the PolPaL (Political Party Links) website.
 * 
 * This is the main landing page that displays:
 * - Welcome message and project description
 * - Real-time statistics about the database (countries, entities, projects, etc.)
 * - Searchable table of available datasets organized by projects
 * - Latest news entries from the platform
 * - Placeholder for future world map visualization
 * 
 * The page features a responsive two-column layout with authentication-based
 * functionality for news management (add/edit/delete operations for admins).
 * 
 * @component
 * @returns The main home page with project overview, statistics, datasets, and news
 * 
 * @see {@link /documentation/about} For detailed information about the PolPaL project
 * @see {@link https://partyfacts.herokuapp.com/} Party Facts - the inspiration for PolPaL
 * 
 * @example
 * ```tsx
 * // Used as the default export for the home route
 * export default function Home() {
 *   // Component implementation
 * }
 * ```
 */
export default function Homepage() {
  // State variables for statistics, datasets, and news
  const [stats, setStats] = useState<Statistics | null>(null);
  const [datasets, setDatasets] = useState<Datasets[] | null>(null);
  const [news, setNews] = useState<News[] | null>(null);
  const [logoEntities, setLogoEntities] = useState<LogoEntity[]>([]);
  const [colorEntities, setColorEntities] = useState<ColorEntity[]>([]);
  const [entityByYear, setEntityByYear] = useState<EntityYearItem[]>([]);

  // Authentication context
  const { auth } = useAuth();
  const isLoggedIn = !!auth?.userId;
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [revealed, setRevealed] = useState(false);

  // Fetch datasets, statistics, and news on component mount
  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    async function fetchAllData() {

      setLoadingData(true);
      setError(null);

      try {
        const [statsRes, datasetsRes, newsRes, colorsRes, entityByYearRes] = await Promise.all([
          fetch(`/api/internal/statistics`, {
            credentials: "include",
            signal,
          }),
          fetch(`/api/datasets/homepage`, {
            credentials: "include",
            signal,
          }),
          fetch(`/api/news/`, {
            credentials: "include",
            signal,
          }),
          fetch(`/api/entities/random-colors`, {
            signal,
          }),
          fetch(`/api/internal/entities-by-year`, {
            signal,
          }),
          {/*
            fetch(`/api/entities/random-logos`, {
            credentials: "include",
            signal,
          }),
          */}
        ]);

        // Check all responses
        if (!statsRes.ok) throw new Error(`Failed to fetch stats: HTTP ${statsRes.status}`);
        if (!datasetsRes.ok) throw new Error(`Failed to fetch datasets: HTTP ${datasetsRes.status}`);
        if (!newsRes.ok) throw new Error(`Failed to fetch news: HTTP ${newsRes.status}`);
        if (!colorsRes.ok) console.warn(`Failed to fetch colors: HTTP ${colorsRes.status}`);
        {/* if (!logosRes.ok) console.warn(`Failed to fetch logos: HTTP ${logosRes.status}`); */ }

        // Parse all responses
        const [statsData, datasetsData, newsData, colorsData, entityByYearData] = await Promise.all([
          statsRes.json(),
          datasetsRes.json(),
          newsRes.json(),
          colorsRes.ok ? colorsRes.json() : Promise.resolve([]),
          entityByYearRes.ok ? entityByYearRes.json() : Promise.resolve([]),
          {/* logosRes.ok ? logosRes.json() : Promise.resolve([]), */ }
        ]);

        // Set all data
        setStats(statsData);
        setDatasets(datasetsData);
        setNews(newsData);
        {/* setLogoEntities(Array.isArray(logosData) ? logosData : []); */ }
        setLogoEntities([]); // Temporarily disable logos until we have figured out copyright/license issues
        setColorEntities(Array.isArray(colorsData) ? colorsData : []);
        setEntityByYear(Array.isArray(entityByYearData) ? entityByYearData : []);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error("Failed to fetch data", err);
          setError(err instanceof Error ? err.message : "Failed to fetch data");
        }
      } finally {
        // Only set loading to false if not aborted
        if (!abortController.signal.aborted) {
          setLoadingData(false);
        }
      }
    }

    fetchAllData();

    // Cleanup function - aborts all ongoing requests
    return () => {
      abortController.abort();
    };
  }, [isLoggedIn]);

  // Memoized filtered datasets based on search input
  const filteredDatasets = useMemo(() => {
    const lowerSearch = search.toLowerCase().trim();

    return (datasets || [])
      .filter((ds) => {
        if (!isLoggedIn && (ds.projectIsHidden || ds.datasetIsHidden)) return false;
        const projectNameShort =
          ds.projectNameShort?.toLowerCase() || "";
        const projectName = ds.projectName?.toLowerCase() || "";
        const datasetNameShort = ds.datasetNameShort?.toLowerCase() || "";
        const datasetName = ds.datasetName?.toLowerCase() || "";

        return (
          projectNameShort.includes(lowerSearch) ||
          projectName.includes(lowerSearch) ||
          datasetNameShort.includes(lowerSearch) ||
          datasetName.includes(lowerSearch)
        );
      })
      .sort((a, b) =>
        (a.projectNameShort || "").localeCompare(
          b.projectNameShort || ""
        )
      );
  }, [datasets, search, isLoggedIn]);

  // Render loading state
  if (loadingData) {
    return <LoadingSpinner title="Loading homepage..." message="Fetching homepage datasets, statistics, and news. Please wait a moment." />;
  }

  // Render error state
  if (error) {
    return <ErrorState message="We encountered an issue while loading the homepage." error={error} />;
  }

  // Main homepage content
  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

          {/* LEFT — welcome + stats + news */}
          <div className="flex flex-col gap-8 h-full">

            {/* Welcome */}
            <div className="space-y-4">
              <div className="space-y-2">
                <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900">
                  Welcome to PolPaL
                </h1>
                <h2 className="text-lg font-medium text-primary">
                  Political Party Links
                </h2>
              </div>

              <p className="text-gray-600 text-justify leading-relaxed">
                Political Party Links (PolPaL) is a linkage key infrastructure
                project for the social sciences. PolPaL provides a unified linkage platform
                for identifying political entities across social science datasets.
              </p>

              <p className="text-gray-600 text-justify leading-relaxed">
                PolPaL, inspired by Party Facts, provides new linkage features,
                broader metadata, and extended coverage. It offers researchers a
                comprehensive, consistent, and long-term foundation for studying
                political entities globally and historically.
              </p>

              {stats && (
                <div className="mt-6 space-y-1">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[
                      ["Countries", stats.countriesCount],
                      ["Entities", `${stats.allCount}`],
                      ["Entries", revealed ? stats.totalEntriesCount : stats.entriesCount],
                      ["Projects", revealed ? stats.totalProjectsCount : stats.projectsCount],
                      ["Datasets", revealed ? stats.totalDatasetsCount : stats.datasetsCount],
                      ["Versions", revealed ? stats.totalVersionsCount : stats.versionsCount],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-xl px-4 py-3 bg-gray-50 border border-gray-200"
                      >
                        <p className="text-2xl font-bold text-gray-900">{value}</p>
                        <p className="text-xs text-gray-600">{label}</p>
                      </div>
                    ))}
                  </div>
                  {!isLoggedIn && (
                    <>
                      {!revealed ? (
                        <p
                          className="text-xs text-primary hover:underline cursor-pointer px-2"
                          onClick={() => setRevealed(true)}
                        >
                          Click here to reveal the numbers including data we are currently working on for future integration.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <p className="text-xs text-gray-600">
                            <Link href="/documentation/working-on" className="text-primary hover:underline">
                              Learn more
                            </Link>
                            {" "}
                            about the data we are currently working on for future integration
                            {" — "}
                            <span
                              className="text-primary hover:underline cursor-pointer"
                              onClick={() => setRevealed(false)}
                            >
                              Hide
                            </span>
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="mt-6">
                <p className="text-xs text-gray-500 mb-3 text-justify">
                  <span className="font-medium">Inspired by Party Facts:</span> A linkage key database created by Holger Döring and Sven Regel. The core party list of the 2023 stable release of Party Facts is used as the basis for the PolPaL entity list (see{' '}
                  <Link href="/documentation/about" className="text-primary hover:underline">
                    About
                  </Link>
                  ).
                </p>
              </div>
            </div>

            {/* News */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-100 rounded-lg p-3">
                  <svg aria-hidden="true" className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" clipRule="evenodd" />
                    <path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-800 hover:underline hover:text-primary">
                    <Link href="/documentation/news">Latest from PolPaL</Link>
                  </h2>
                </div>
                {["ADMIN", "DATAMANAGER"].includes(auth.role ?? "") && (
                  <ButtonAdd text="" href="/manage/news/create" ariaLabel="Add News Entry" />
                )}
              </div>

              {news && news.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {news
                    .sort((a, b) => new Date(b.publishedPublicAt).getTime() - new Date(a.publishedPublicAt).getTime())
                    .map((article) => (
                      <div key={article.newsId} className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {/* Date row */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1.5 text-xs text-gray-500">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
                                Published: {new Date(article.publishedPublicAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                              </span>
                              {article.updatedPublicAt && (
                                <span className="flex items-center gap-1.5 text-primary">
                                  <span className="w-2 h-2 bg-primary rounded-full shrink-0" />
                                  Updated: {new Date(article.updatedPublicAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                            {/* Title */}
                            <h3 className="text-sm font-semibold text-gray-900 leading-snug mb-1.5">
                              {article.title}
                            </h3>
                            {/* Content preview */}
                            <p className="text-xs text-gray-600 text-justify whitespace-pre-wrap leading-relaxed">
                              {article.content.slice(0, 200)}{article.content.length > 200 ? "…" : ""}
                            </p>
                            {/* Links */}
                            {article.links && article.links.length > 0 && (
                              <ul className="mt-2 space-y-0.5 text-xs">
                                {article.links.map((link, idx) => (
                                  <li key={idx}>
                                    <a href={link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block max-w-xs">
                                      {link.length > 50 ? `${link.slice(0, 50)}…` : link}
                                      <ExternalLink className="inline-block w-3.5 h-3.5 ml-1 scale-80" />
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic py-8 text-center">No news available.</p>
              )}
            </div>
          </div>

          {/* RIGHT — datasets table */}
          <div className="flex flex-col gap-4 h-full">

            {/* Color showcase sourced from Wikidata */}
            {logoEntities.length === 0 && colorEntities.length > 0 && (
              <div className="flex flex-col gap-4 mb-6">
                <div className="text-xs text-gray-400 italic text-center w-full">
                  Random selection of six PolPaL entities and their associated colors.
                </div>
                <div className="flex flex-wrap gap-6 items-center justify-center">
                  {colorEntities.map((entity, index) => (
                    <Link
                      key={entity.polpalId}
                      href={`/data/entities/${entity.polpalId}`}
                      className={`${index >= 6 ? "hidden lg:flex" : "flex"} flex-col items-center gap-1 group`}
                      title={entity.nameEnglish}
                      aria-label={`View details for ${entity.nameEnglish}`}
                    >
                      <div
                        className="w-20 h-20 rounded-lg border border-gray-200 group-hover:border-primary transition-colors"
                        style={{ backgroundColor: `#${entity.color}` }}
                      />
                      <span className="text-xs text-gray-600 text-center max-w-[5rem] truncate group-hover:text-primary">
                        {entity.nameShort}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Logo showcase sourced from Wikidata */}
            {logoEntities.length > 0 && (
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-wrap gap-6 items-center justify-center">
                  {logoEntities.map((entity, index) => (
                    <div key={entity.polpalId} className={`${index >= 2 ? "hidden sm:flex" : "flex"} flex-col items-center gap-1`}>
                      {entity.attribution && (
                        <a
                          href={entity.attribution.filePageUrl || undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] text-gray-400 hover:text-gray-600 leading-tight text-center max-w-[5rem] truncate"
                          title={`${dedup(entity.attribution.artist) || dedup(entity.attribution.credit)} · ${entity.attribution.license}${entity.attribution.restrictions?.includes('trademarked') ? ' ™' : ''}`}
                        >
                          {dedup(entity.attribution.artist) || dedup(entity.attribution.credit)
                            ? `© ${dedup(entity.attribution.artist) || dedup(entity.attribution.credit)}`
                            : null}
                          {(dedup(entity.attribution.artist) || dedup(entity.attribution.credit)) && entity.attribution.license ? ' · ' : null}
                          {entity.attribution.license || null}
                          {entity.attribution.restrictions?.includes('trademarked') ? ' ™' : null}
                        </a>
                      )}
                      <Link
                        href={`/data/entities/${entity.polpalId}`}
                        className="flex flex-col items-center gap-1 group"
                        title={entity.nameEnglish}
                        aria-label={`View details for ${entity.nameEnglish}`}
                      >
                        <div className="w-20 h-20 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-2 group-hover:border-primary transition-colors">
                          <Image
                            src={entity.logoUrl}
                            alt={`Logo of ${entity.nameEnglish}`}
                            width={80}
                            height={80}
                            className="max-w-full max-h-full object-contain"
                            loading="lazy"
                            unoptimized
                            onError={() => setLogoEntities((prev) => prev.filter((e) => e.polpalId !== entity.polpalId))}
                          />
                        </div>
                        <span className="text-xs text-gray-600 text-center max-w-[5rem] truncate group-hover:text-primary">
                          {entity.nameShort}
                        </span>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <SearchInput value={search} onChange={setSearch} placeholder="Search datasets..." className="w-full" />

            {filteredDatasets.length === 0 ? (
              <p className="text-gray-600 text-xs text-center py-8">
                No matching datasets found.
              </p>
            ) : (
              <div className="overflow-auto max-h-135 border border-gray-200 rounded-lg shadow-sm">
                <table className="min-w-full text-xs text-gray-800">
                  <thead className="sticky top-0 bg-gray-100 text-gray-700 whitespace-nowrap">
                    <tr>
                      {[
                        { label: "Project Abbr.", mobile: true },
                        { label: "Project", mobile: false },
                        { label: "Dataset Abbr.", mobile: true },
                        { label: "Dataset", mobile: false },
                      ].map(({ label, mobile }) => (
                        <th key={label} scope="col" className={`px-2 py-1 text-left font-semibold${mobile ? "" : " hidden sm:table-cell"}`}>
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredDatasets
                      .sort((a, b) => {
                        const projectCompare = (a.projectNameShort || "").localeCompare(b.projectNameShort || "");
                        if (projectCompare !== 0) return projectCompare;
                        return (a.datasetNameShort || "").localeCompare(b.datasetNameShort || "");
                      })
                      .map((ds) => (
                        <tr key={ds.datasetKey} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-primary">
                            <Link href={`/data/projects/${ds.projectKey}`} className="hover:underline" title={ds.projectNameShort}>
                              {ds.projectNameShort}
                            </Link>
                          </td>
                          <td className="hidden sm:table-cell px-4 py-3 text-gray-700">
                            <Link href={`/data/projects/${ds.projectKey}`} className="hover:underline" title={ds.projectName}>
                              {ds.projectName}
                            </Link>
                          </td>
                          <td className="px-4 py-3 font-medium text-primary">
                            <Link href={`/data/projects/${ds.projectKey}/${ds.datasetKey}`} className="hover:underline" title={ds.datasetNameShort}>
                              {ds.datasetNameShort}
                            </Link>
                          </td>
                          <td className="hidden sm:table-cell px-4 py-3 text-gray-700">
                            <Link href={`/data/projects/${ds.projectKey}/${ds.datasetKey}`} className="hover:underline" title={ds.datasetName}>
                              {ds.datasetName}
                            </Link>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* PolPaL Entity Appearances Over Time */}
            {entityByYear.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6 mt-8">
                  <div className="bg-primary/10 rounded-lg p-3">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-800">
                      PolPaL Entity Appearances Over Time
                    </h2>
                    <p className="text-sm text-gray-600">
                      Appearance of PolPaL entities in datasets across years (1880 onwards; pre-1880 grouped)
                    </p>
                  </div>
                </div>
                <HomepageFigure data={entityByYear} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
