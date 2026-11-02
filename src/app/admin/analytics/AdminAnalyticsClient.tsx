"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { RoleEnum } from "@/lib/shared/enums";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import {
    AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer,
} from "recharts";

// ── Colour palette per download type ──────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
    COUNTRIES: "#0072B2",
    ENTITIES: "#56B4E9",
    GROUPINGS: "#009E73",
    ENTRIES: "#E69F00",
    SCRIPT: "#CC79A7",
};
const ALL_TYPES = ["COUNTRIES", "ENTITIES", "GROUPINGS", "ENTRIES", "SCRIPT"] as const;
const TYPE_LABELS: Record<string, string> = {
    COUNTRIES: "Countries",
    ENTITIES: "Entities",
    GROUPINGS: "Groupings",
    ENTRIES: "Entries",
    SCRIPT: "R Scripts",
};

// ── Interfaces ────────────────────────────────────────────────────────────────
interface ByType { downloadType: string; count: number; }
interface TopScript { scriptName: string | null; count: number; }
interface TopDataset { datasetKey: string; count: number; }
interface TopProject { projectKey: string; count: number; }
interface TopVersion { versionKey: string | null; count: number; }
interface EntryVersionStat {
    versionKey: string | null;
    count: number;
    noFilter: number;
    withCountry: number;
    withRegion: number;
    withYear: number;
    withVariables: number;
    withShort: number;
    withSpecialLinks: number;
}
interface TimeRow { date?: string; month?: string; downloadType: string; count: number; }

interface AnalyticsData {
    byType: ByType[];
    topEntries: TopVersion[];
    topScripts: TopScript[];
    daily: TimeRow[];
    monthly: TimeRow[];
    allEntryVersions: EntryVersionStat[];
    topDatasets: TopDataset[];
    topProjects: TopProject[];
    topVersions: TopVersion[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Pivot flat [{date, downloadType, count}] into [{date, COUNTRIES: n, ENTRIES: n, …}] */
function pivotTimeSeries(rows: TimeRow[], key: "date" | "month") {
    const map = new Map<string, Record<string, number>>();
    for (const r of rows) {
        const label = r[key] ?? "";
        if (!map.has(label)) map.set(label, { [key]: label } as unknown as Record<string, number>);
        map.get(label)![r.downloadType] = (map.get(label)![r.downloadType] ?? 0) + r.count;
    }
    return Array.from(map.values()).sort((a, b) =>
        String(a[key]).localeCompare(String(b[key]))
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col gap-1">
            <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
        </div>
    );
}

function RankTable({ title, rows, colA, colB }: { title: string; rows: { a: string; b: number }[]; colA: string; colB: string }) {
    if (rows.length === 0) return null;
    const max = rows[0]?.b ?? 1;
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            </div>
            <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <tr>
                        <th scope="col" className="px-5 py-2 text-left">{colA}</th>
                        <th scope="col" className="px-5 py-2 text-right w-24">{colB}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {rows.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                            <td className="px-5 py-2 text-gray-800 break-all">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="h-1.5 rounded-full shrink-0"
                                        style={{ width: `${Math.round((r.b / max) * 80)}px`, backgroundColor: TYPE_COLORS.ENTRIES }}
                                    />
                                    <span className="font-mono text-xs whitespace-nowrap">{r.a}</span>
                                </div>
                            </td>
                            <td className="px-5 py-2 text-right text-gray-700 tabular-nums">{r.b.toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function CustomTooltip({ active, payload, label }: {
    active?: boolean;
    payload?: { name: string; value: number; color: string }[];
    label?: string;
}) {
    if (!active || !payload || payload.length === 0) return null;
    const visible = payload.filter(p => (p.value ?? 0) > 0);
    const total = visible.reduce((s, p) => s + p.value, 0);
    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-xs min-w-[140px]">
            <p className="font-semibold text-gray-600 mb-1.5">{label}</p>
            {visible.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-gray-600">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                        {TYPE_LABELS[p.name] ?? p.name}
                    </span>
                    <span className="tabular-nums font-medium text-gray-900">{p.value.toLocaleString()}</span>
                </div>
            ))}
            {visible.length > 1 && (
                <div className="border-t border-gray-100 mt-1.5 pt-1.5 flex justify-between gap-4 font-semibold text-gray-900">
                    <span>Total</span>
                    <span className="tabular-nums">{total.toLocaleString()}</span>
                </div>
            )}
        </div>
    );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            </div>
            <div className="p-4">{children}</div>
        </div>
    );
}

function DetailTable({ title, data: rows, keyCol }: {
    title: string;
    data: Record<string, number>[];
    keyCol: "date" | "month";
}) {
    if (rows.length === 0) return null;
    const types = ALL_TYPES.filter(t => rows.some(r => (r[t] ?? 0) > 0));
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                        <tr>
                            <th scope="col" className="px-5 py-2 text-left">{keyCol === "date" ? "Date" : "Month"}</th>
                            {types.map(t => (
                                <th key={t} scope="col" className="px-4 py-2 text-right">
                                    <span className="inline-flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: TYPE_COLORS[t] }} />
                                        {TYPE_LABELS[t]}
                                    </span>
                                </th>
                            ))}
                            <th scope="col" className="px-5 py-2 text-right font-semibold text-gray-700">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {[...rows].reverse().map((r, i) => {
                            const total = types.reduce((s, t) => s + (r[t] ?? 0), 0);
                            return (
                                <tr key={i} className="hover:bg-gray-50">
                                    <td className="px-5 py-2 font-mono text-gray-700 whitespace-nowrap">{String(r[keyCol])}</td>
                                    {types.map(t => (
                                        <td key={t} className="px-4 py-2 text-right tabular-nums text-gray-700">
                                            {(r[t] ?? 0) > 0 ? (r[t] as number).toLocaleString() : <span className="text-gray-300">—</span>}
                                        </td>
                                    ))}
                                    <td className="px-5 py-2 text-right tabular-nums font-semibold text-gray-900">{total.toLocaleString()}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200 text-xs font-semibold text-gray-700">
                        <tr>
                            <td className="px-5 py-2 uppercase tracking-wide">Total</td>
                            {types.map(t => (
                                <td key={t} className="px-4 py-2 text-right tabular-nums">
                                    {rows.reduce((s, r) => s + (r[t] ?? 0), 0).toLocaleString()}
                                </td>
                            ))}
                            <td className="px-5 py-2 text-right tabular-nums">
                                {rows.reduce((s, r) => s + types.reduce((ts, t) => ts + (r[t] ?? 0), 0), 0).toLocaleString()}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}


export default function AdminAnalyticsClient() {
    const { auth, loadingAuth } = useAuth();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (loadingAuth) return;
        if (!auth.loggedIn || auth.role !== RoleEnum.ADMIN) return;
        const controller = new AbortController();
        const load = async () => {
            setLoading(true);
            fetch('/api/admin/analytics', { credentials: 'include', signal: controller.signal })
                .then(res => { if (!res.ok) throw new Error('Failed to load analytics.'); return res.json(); })
                .then((d: AnalyticsData) => setData(d))
                .catch((err: unknown) => { if (err instanceof Error && err.name === 'AbortError') return; setError(err instanceof Error ? err.message : 'Error fetching analytics.'); })
                .finally(() => setLoading(false));
        };
        load();
        return () => controller.abort();
    }, [auth.loggedIn, auth.role, loadingAuth]);

    if (!auth || loadingAuth) return <LoadingSpinner title="Loading..." message="Authenticating user." />;
    if (auth.role !== RoleEnum.ADMIN) return <AccessDenied message="ADMIN rights required." />;
    if (loading) return <LoadingSpinner title="Loading analytics..." message="Fetching download statistics." />;
    if (error) return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <p role="alert" className="text-red-600 text-sm">{error}</p>
        </div>
    );
    if (!data) return null;

    const totalDownloads = data.byType.reduce((s, r) => s + r.count, 0);
    const typeMap = Object.fromEntries(data.byType.map(r => [r.downloadType, r.count]));

    const dailyData = pivotTimeSeries(data.daily, "date");
    const monthlyData = pivotTimeSeries(data.monthly, "month");

    // Determine which types actually appear in the data (to skip empty series)
    const activeTypes = ALL_TYPES.filter(t => data.byType.some(r => r.downloadType === t));

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <Breadcrumbs items={[
                { label: "Home", href: "/" },
                { label: "Admin", href: "/admin" },
                { label: "Download Analytics" },
            ]} />

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">Download Analytics</h1>
                <p className="text-gray-500">Aggregate download statistics across all data types and R scripts.</p>
            </div>

            {/* ── Summary stat cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard label="Total" value={totalDownloads} color="#333333" />
                <StatCard label="Countries" value={typeMap['COUNTRIES'] ?? 0} color={TYPE_COLORS.COUNTRIES} />
                <StatCard label="Entities" value={typeMap['ENTITIES'] ?? 0} color={TYPE_COLORS.ENTITIES} />
                <StatCard label="Groupings" value={typeMap['GROUPINGS'] ?? 0} color={TYPE_COLORS.GROUPINGS} />
                <StatCard label="Entries" value={typeMap['ENTRIES'] ?? 0} color={TYPE_COLORS.ENTRIES} />
                <StatCard label="R Scripts" value={typeMap['SCRIPT'] ?? 0} color={TYPE_COLORS.SCRIPT} />
            </div>

            {/* ── Charts ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily area chart */}
                <ChartCard title="Daily Downloads — last 30 days">
                    {dailyData.length === 0
                        ? <p className="text-sm text-gray-400 italic py-8 text-center">No data yet.</p>
                        : (
                            <ResponsiveContainer width="100%" height={240}>
                                <AreaChart data={dailyData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                                    <defs>
                                        {activeTypes.map(t => (
                                            <linearGradient key={t} id={`grad-${t}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={TYPE_COLORS[t]} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={TYPE_COLORS[t]} stopOpacity={0} />
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend formatter={name => TYPE_LABELS[String(name)] ?? String(name)} wrapperStyle={{ fontSize: 11 }} />
                                    {activeTypes.map(t => (
                                        <Area
                                            key={t}
                                            type="monotone"
                                            dataKey={t}
                                            stroke={TYPE_COLORS[t]}
                                            fill={`url(#grad-${t})`}
                                            strokeWidth={2}
                                            dot={false}
                                            activeDot={{ r: 4 }}
                                        />
                                    ))}
                                </AreaChart>
                            </ResponsiveContainer>
                        )
                    }
                </ChartCard>

                {/* Monthly bar chart */}
                <ChartCard title="Monthly Downloads — all time">
                    {monthlyData.length === 0
                        ? <p className="text-sm text-gray-400 italic py-8 text-center">No data yet.</p>
                        : (
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend formatter={name => TYPE_LABELS[String(name)] ?? String(name)} wrapperStyle={{ fontSize: 11 }} />
                                    {activeTypes.map(t => (
                                        <Bar key={t} dataKey={t} stackId="a" fill={TYPE_COLORS[t]} radius={t === activeTypes[activeTypes.length - 1] ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        )
                    }
                </ChartCard>
            </div>

            {/* ── Rank tables ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <RankTable
                    title="Top Projects (by entry downloads)"
                    rows={data.topProjects.map(r => ({ a: r.projectKey, b: r.count }))}
                    colA="Project"
                    colB="Downloads"
                />
                <RankTable
                    title="Top Datasets (by entry downloads)"
                    rows={data.topDatasets.map(r => ({ a: r.datasetKey, b: r.count }))}
                    colA="Dataset"
                    colB="Downloads"
                />
                <RankTable
                    title="Top Versions (by entry downloads)"
                    rows={data.topEntries.map(r => ({ a: r.versionKey ?? '—', b: r.count }))}
                    colA="Version Key"
                    colB="Downloads"
                />
            </div>

            {/* ── Detailed breakdown tables ── */}
            <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Detailed Breakdown</h2>
                <DetailTable title="Daily Downloads — last 30 days" data={dailyData} keyCol="date" />
                <DetailTable title="Monthly Downloads — all time" data={monthlyData} keyCol="month" />
            </div>

            {/* ── All entry dataset versions ── */}
            {data.allEntryVersions.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900">Entry Dataset Version Downloads</h2>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                                    <tr>
                                        <th scope="col" className="px-4 py-2 text-right w-10">#</th>
                                        <th scope="col" className="px-5 py-2 text-left">Version Key</th>
                                        <th scope="col" className="px-4 py-2 text-right">Total</th>
                                        <th scope="col" className="px-4 py-2 text-right">Share</th>
                                        <th scope="col" className="px-4 py-2 text-right">Country</th>
                                        <th scope="col" className="px-4 py-2 text-right">Region</th>
                                        <th scope="col" className="px-4 py-2 text-right">Variables</th>
                                        <th scope="col" className="px-4 py-2 text-right">Short</th>
                                        <th scope="col" className="px-4 py-2 text-right">Spec. Links</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(() => {
                                        const total = data.allEntryVersions.reduce((s, r) => s + r.count, 0);
                                        const max = data.allEntryVersions[0]?.count ?? 1;
                                        return data.allEntryVersions.map((r, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 text-right tabular-nums text-gray-400 text-xs">{i + 1}</td>
                                                <td className="px-5 py-2 text-gray-800">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="h-1.5 rounded-full shrink-0"
                                                            style={{ width: `${Math.round((r.count / max) * 80)}px`, backgroundColor: TYPE_COLORS.ENTRIES }}
                                                        />
                                                        <span className="font-mono text-xs">{r.versionKey ?? '—'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2 text-right tabular-nums font-semibold text-gray-900">{r.count.toLocaleString()}</td>
                                                <td className="px-4 py-2 text-right tabular-nums text-gray-500">{total > 0 ? `${((r.count / total) * 100).toFixed(1)}%` : '—'}</td>
                                                <td className="px-4 py-2 text-right tabular-nums text-gray-700">{r.withCountry > 0 ? r.withCountry.toLocaleString() : <span className="text-gray-200">—</span>}</td>
                                                <td className="px-4 py-2 text-right tabular-nums text-gray-700">{r.withRegion > 0 ? r.withRegion.toLocaleString() : <span className="text-gray-200">—</span>}</td>
                                                <td className="px-4 py-2 text-right tabular-nums text-gray-700">{r.withVariables > 0 ? r.withVariables.toLocaleString() : <span className="text-gray-200">—</span>}</td>
                                                <td className="px-4 py-2 text-right tabular-nums text-gray-700">{r.withShort > 0 ? r.withShort.toLocaleString() : <span className="text-gray-200">—</span>}</td>
                                                <td className="px-4 py-2 text-right tabular-nums text-gray-700">{r.withSpecialLinks > 0 ? r.withSpecialLinks.toLocaleString() : <span className="text-gray-200">—</span>}</td>
                                            </tr>
                                        ));
                                    })()}
                                </tbody>
                                <tfoot className="bg-gray-50 border-t border-gray-200 text-xs font-semibold text-gray-700">
                                    <tr>
                                        <td className="px-4 py-2" />
                                        <td className="px-5 py-2 uppercase tracking-wide">Total</td>
                                        <td className="px-4 py-2 text-right tabular-nums">{data.allEntryVersions.reduce((s, r) => s + r.count, 0).toLocaleString()}</td>
                                        <td className="px-4 py-2 text-right">100%</td>
                                        <td className="px-4 py-2 text-right tabular-nums">{data.allEntryVersions.reduce((s, r) => s + r.withCountry, 0).toLocaleString()}</td>
                                        <td className="px-4 py-2 text-right tabular-nums">{data.allEntryVersions.reduce((s, r) => s + r.withRegion, 0).toLocaleString()}</td>
                                        <td className="px-4 py-2 text-right tabular-nums">{data.allEntryVersions.reduce((s, r) => s + r.withVariables, 0).toLocaleString()}</td>
                                        <td className="px-4 py-2 text-right tabular-nums">{data.allEntryVersions.reduce((s, r) => s + r.withShort, 0).toLocaleString()}</td>
                                        <td className="px-4 py-2 text-right tabular-nums">{data.allEntryVersions.reduce((s, r) => s + r.withSpecialLinks, 0).toLocaleString()}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
