"use client";

import { useMemo } from "react";
import {
    ComposedChart,
    Bar,
    XAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

export interface EntryIntensityItem {
    projectKey: string;
    projectNameShort: string;
    projectName: string;
    datasetKey: string;
    datasetNameShort: string;
    datasetName: string;
    entryYear: number | null;
}

interface DatasetGroup {
    projectNameShort: string;
    items: string[];
}

interface Props {
    data: EntryIntensityItem[];
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { displayYear: string | number; datasetCount: number; datasetGroups: DatasetGroup[] } }> }) => {
    if (active && payload && payload.length) {
        const d = payload[0].payload;
        return (
            <div className="bg-white border border-gray-200 rounded-lg shadow-xl text-xs p-3 min-w-[200px]">
                <p className="font-semibold text-gray-800 mb-1.5">
                    Year: <span className="text-gray-800">{d.displayYear}</span>
                    <span className="ml-2 font-normal text-gray-400">({d.datasetCount} dataset{d.datasetCount !== 1 ? "s" : ""})</span>
                </p>
                <ul className="space-y-1.5 border-t border-gray-100 pt-1.5">
                    {d.datasetGroups.map((group: DatasetGroup, i: number) => (
                        <li key={i}>
                            <p className="font-semibold text-gray-700">{group.projectNameShort}</p>
                            <ul className="ml-3 mt-0.5 space-y-0.5">
                                {group.items.map((item: string, j: number) => (
                                    <li key={j} className="text-gray-500 font-mono">{item}</li>
                                ))}
                            </ul>
                        </li>
                    ))}
                </ul>
            </div>
        );
    }
    return null;
};

export function EntityDatasetFigure({ data }: Props) {
    const intensityData = useMemo(() => {
        const pre1880Year = 1879;
        // yearData[yearKey][projectNameShort] = { projectNameShort, datasets: { [datasetNameShort]: Set<actualYears> } }
        const yearData: { [key: number]: { [project: string]: { projectNameShort: string; datasets: { [dataset: string]: Set<number> } } } } = {};

        data.forEach(entry => {
            if (entry.entryYear !== null && entry.entryYear <= 2030) {
                const yearKey = entry.entryYear < 1880 ? pre1880Year : entry.entryYear;
                if (!yearData[yearKey]) yearData[yearKey] = {};
                if (!yearData[yearKey][entry.projectNameShort]) {
                    yearData[yearKey][entry.projectNameShort] = { projectNameShort: entry.projectNameShort, datasets: {} };
                }
                const ds = yearData[yearKey][entry.projectNameShort].datasets;
                if (!ds[entry.datasetNameShort]) ds[entry.datasetNameShort] = new Set();
                ds[entry.datasetNameShort].add(entry.entryYear);
            }
        });

        const chartData = Object.entries(yearData)
            .map(([yearKey, projects]) => {
                const yr = parseInt(yearKey);
                const datasetGroups: DatasetGroup[] = Object.values(projects)
                    .sort((a, b) => a.projectNameShort.localeCompare(b.projectNameShort))
                    .map(proj => ({
                        projectNameShort: proj.projectNameShort,
                        items: Object.entries(proj.datasets)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([dsName, years]) =>
                                yr === pre1880Year ? `${dsName} (${years.size} obs.)` : dsName
                            ),
                    }));
                const datasetCount = Object.values(projects).reduce(
                    (sum, proj) => sum + Object.keys(proj.datasets).length, 0
                );
                return {
                    year: yr,
                    intensity: 1,
                    datasetGroups,
                    datasetCount,
                    displayYear: yr === pre1880Year ? "before 1880" : yr,
                };
            })
            .sort((a, b) => a.year - b.year);

        const maxDatasets = Math.max(...chartData.map(d => d.datasetCount), 1);
        return chartData.map(item => ({
            ...item,
            fill: `rgba(72, 140, 204, ${0.2 + (item.datasetCount - 1) * 0.8 / maxDatasets})`,
        }));
    }, [data]);

    if (intensityData.length === 0) return null;

    return (
        <div className="w-full">
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-gray-500 px-5">
                <div className="flex items-center gap-1.5">
                    <div className="flex gap-px">
                        {[0.2, 0.4, 0.6, 0.8, 1.0].map((o, i) => (
                            <div key={i} className="w-2 h-3 rounded-sm" style={{ background: `rgba(72,140,204,${o})` }} />
                        ))}
                    </div>
                    <span>Fewer → More Datasets</span>
                </div>
                <span className="ml-auto text-gray-400 italic">Hover a bar for details</span>
            </div>
            <div className="h-20">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={intensityData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="1 1" />
                    <XAxis
                        dataKey="year"
                        tick={{ fontSize: 8 }}
                        tickFormatter={(value) => value === 1879 ? "<1880" : value.toString()}
                        domain={[1879, 2030]}
                        type="number"
                        scale="linear"
                        ticks={[1879, 1880, 1885, 1890, 1895, 1900, 1905, 1910, 1915, 1920, 1925, 1930, 1935, 1940, 1945, 1950, 1955, 1960, 1965, 1970, 1975, 1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020, 2025, 2030]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                        dataKey="intensity"
                        name="Dataset Count"
                        barSize={2}
                        radius={[1, 1, 0, 0]}
                        fill="#488ccc"
                    />
                </ComposedChart>
            </ResponsiveContainer>
            </div>
        </div>
    );
}
