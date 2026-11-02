"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AccessDenied } from "@/components/ui/AccessDenied";
import { RoleEnum } from "@/lib/shared/enums";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ── Interfaces (mirror /api/admin/user-activities response) ───────────────────
interface Category { key: string; label: string; }
interface UserRow {
    userId: number;
    name: string;
    username: string;
    email: string;
    counts: Record<string, number>;
    total: number;
}
interface Overview {
    categories: Category[];
    users: UserRow[];
    totals: Record<string, number>;
    grandTotal: number;
    range: { from: string | null; to: string | null };
}

// ── Colour palette per activity category (colourblind-friendly) ───────────────
const CATEGORY_COLORS: Record<string, string> = {
    entitiesCreated: "#0072B2",
    entitiesUpdated: "#918e00",
    entitiesDeleted: "#ff0000",
    entityNamesAdded: "#b500e2",
    entityChangesAdded: "#f5a700",
    groupingMembersAdded: "#2fb905",
    linksCreated: "#488ccc",
    linksDeleted: "#830000",
};

// Compact labels used in the chart legend/axes.
const SHORT_LABELS: Record<string, string> = {
    entitiesCreated: "Entities created",
    entitiesUpdated: "Entities updated",
    entitiesDeleted: "Entities deleted",
    entityNamesAdded: "Entity names added",
    entityChangesAdded: "Entity changes added",
    groupingMembersAdded: "Memberships added",
    linksCreated: "Links created",
    linksDeleted: "Links deleted",
};

const MAX_CHART_USERS = 15;

// ── Helpers ───────────────────────────────────────────────────────────────────
function sharePct(count: number, total: number): number {
    return total > 0 ? (count / total) * 100 : 0;
}
function fmtShare(count: number, total: number): string {
    return `${sharePct(count, total).toFixed(1)}%`;
}

export default function AdminUserActivitiesClient() {
    const { auth, loadingAuth } = useAuth();
    const [data, setData] = useState<Overview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");

    useEffect(() => {
        if (loadingAuth) return;
        if (!auth.loggedIn || auth.role !== RoleEnum.ADMIN) return;
        const controller = new AbortController();
        const load = async () => {
            setLoading(true);
            setError(null);
            const params = new URLSearchParams();
            if (from) params.set("from", from);
            if (to) params.set("to", to);
            const qs = params.toString();
            fetch(`/api/admin/user-activities${qs ? `?${qs}` : ""}`, {
                credentials: "include",
                signal: controller.signal,
            })
                .then((res) => { if (!res.ok) throw new Error("Failed to load user activities."); return res.json(); })
                .then((d: Overview) => setData(d))
                .catch((err: unknown) => { if (err instanceof Error && err.name === "AbortError") return; setError(err instanceof Error ? err.message : "Error fetching user activities."); })
                .finally(() => setLoading(false));
        };
        load();
        return () => controller.abort();
    }, [auth.loggedIn, auth.role, loadingAuth, from, to]);

    // Data for the stacked bar chart: top users by total activity.
    const chartData = useMemo(() => {
        if (!data) return [];
        return data.users.slice(0, MAX_CHART_USERS).map((u) => ({
            name: u.name,
            ...u.counts,
        }));
    }, [data]);

    if (!auth || loadingAuth) return <LoadingSpinner title="Loading..." message="Authenticating user." />;
    if (auth.role !== RoleEnum.ADMIN) return <AccessDenied message="ADMIN rights required." />;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <Breadcrumbs items={[
                { label: "Home", href: "/" },
                { label: "Admin", href: "/admin" },
                { label: "User Activities" },
            ]} />

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">User Activities</h1>
                <p className="text-gray-500">
                    Per-user contributions and each user&apos;s share of the total. Bulk imports are excluded.
                </p>
            </div>

            {/* ── Date range filter ── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-wrap items-end gap-4">
                <div className="flex flex-col gap-1">
                    <label htmlFor="from" className="text-xs text-gray-500 uppercase tracking-wide">From</label>
                    <input
                        id="from"
                        type="date"
                        value={from}
                        max={to || undefined}
                        onChange={(e) => setFrom(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-800"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label htmlFor="to" className="text-xs text-gray-500 uppercase tracking-wide">To</label>
                    <input
                        id="to"
                        type="date"
                        value={to}
                        min={from || undefined}
                        onChange={(e) => setTo(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-800"
                    />
                </div>
                <button
                    type="button"
                    onClick={() => { setFrom(""); setTo(""); }}
                    disabled={!from && !to}
                    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    Reset (all time)
                </button>
                <p className="text-xs text-gray-400 ml-auto self-center">
                    {from || to
                        ? `Showing ${from || "the beginning"} → ${to || "today"}`
                        : "Showing all time"}
                </p>
            </div>

            {loading && <LoadingSpinner title="Loading activities..." message="Aggregating changelog data." />}
            {error && (
                <p role="alert" className="text-red-600 text-sm">{error}</p>
            )}

            {!loading && !error && data && (
                data.users.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-400 italic">
                        No user activity in the selected range.
                    </div>
                ) : (
                    <>
                        {/* ── Stacked bar chart ── */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100">
                                <h3 className="text-sm font-semibold text-gray-900">
                                    Activity by user{data.users.length > MAX_CHART_USERS ? ` — top ${MAX_CHART_USERS}` : ""}
                                </h3>
                            </div>
                            <div className="p-4 overflow-hidden">
                                <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 34 + 60)}>
                                    <BarChart
                                        data={chartData}
                                        layout="vertical"
                                        margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                                        barCategoryGap={10}
                                        barGap={0}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                                        <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                                        <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                                        <Tooltip
                                            formatter={(value, name) => [value, SHORT_LABELS[String(name)] ?? String(name)]}
                                            contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, opacity: 1 }}
                                            wrapperStyle={{ outline: "none", zIndex: 50 }}
                                        />
                                        <Legend formatter={(name) => SHORT_LABELS[String(name)] ?? String(name)} wrapperStyle={{ fontSize: 11 }} />
                                        {data.categories.map((cat) => (
                                            <Bar key={cat.key} dataKey={cat.key} stackId="a" fill={CATEGORY_COLORS[cat.key] ?? "#999999"} barSize={20} />
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* ── Detailed table with per-category counts + share of total ── */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100">
                                <h3 className="text-sm font-semibold text-gray-900">Per-user breakdown</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Each cell shows the count and the user&apos;s share of that category&apos;s total.</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                                        <tr>
                                            <th scope="col" className="px-5 py-2 text-left">User</th>
                                            {data.categories.map((cat) => (
                                                <th key={cat.key} scope="col" className="px-4 py-2 text-right">
                                                    <span className="inline-flex items-center gap-1">
                                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[cat.key] }} />
                                                        {cat.label}
                                                    </span>
                                                </th>
                                            ))}
                                            <th scope="col" className="px-5 py-2 text-right font-semibold text-gray-700">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {data.users.map((u) => (
                                            <tr key={u.userId} className="hover:bg-gray-50">
                                                <td className="px-5 py-2">
                                                    <div className="font-medium text-gray-900">{u.name}</div>
                                                    {u.username && <div className="text-xs text-gray-400">@{u.username}</div>}
                                                </td>
                                                {data.categories.map((cat) => {
                                                    const count = u.counts[cat.key] ?? 0;
                                                    return (
                                                        <td key={cat.key} className="px-4 py-2 text-right tabular-nums text-gray-700">
                                                            {count > 0 ? (
                                                                <>
                                                                    <span>{count.toLocaleString()}</span>
                                                                    <span className="text-xs text-gray-400 ml-1">{fmtShare(count, data.totals[cat.key] ?? 0)}</span>
                                                                </>
                                                            ) : (
                                                                <span className="text-gray-300">—</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-5 py-2 text-right tabular-nums font-semibold text-gray-900">
                                                    {u.total.toLocaleString()}
                                                    <span className="text-xs font-normal text-gray-400 ml-1">{fmtShare(u.total, data.grandTotal)}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 border-t border-gray-200 text-xs font-semibold text-gray-700">
                                        <tr>
                                            <td className="px-5 py-2 uppercase tracking-wide">All users</td>
                                            {data.categories.map((cat) => (
                                                <td key={cat.key} className="px-4 py-2 text-right tabular-nums">
                                                    {(data.totals[cat.key] ?? 0).toLocaleString()}
                                                </td>
                                            ))}
                                            <td className="px-5 py-2 text-right tabular-nums">{data.grandTotal.toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </>
                )
            )}
        </div>
    );
}
