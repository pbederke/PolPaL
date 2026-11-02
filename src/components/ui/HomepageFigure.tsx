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

export interface EntityYearItem {
    year: number;
    entityCount: number;
}

interface Props {
    data: EntityYearItem[];
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { displayYear: string; entityCount: number } }> }) => {
    if (active && payload && payload.length) {
        const d = payload[0].payload;
        return (
            <div className="bg-white border border-gray-200 rounded-lg shadow-xl text-xs p-3 min-w-[160px]">
                <p className="font-semibold text-gray-800 mb-1">
                    Year: <span>{d.displayYear}</span>
                </p>
                <p className="text-gray-600">
                    <span className="font-semibold text-gray-800">{d.entityCount.toLocaleString()}</span>{" "}
                    PolPaL entit{d.entityCount !== 1 ? "ies" : "y"}
                </p>
            </div>
        );
    }
    return null;
};

export function HomepageFigure({ data }: Props) {
    const chartData = useMemo(() => {
        const pre1880Year = 1879;

        const pre1880Items = data.filter(d => d.year < 1880);
        const rest = data.filter(d => d.year >= 1880 && d.year <= 2030);

        const points = rest.map(item => ({
            year: item.year,
            intensity: 1,
            entityCount: item.entityCount,
            displayYear: item.year.toString(),
        }));

        if (pre1880Items.length > 0) {
            const maxCount = Math.max(...pre1880Items.map(d => d.entityCount));
            points.unshift({
                year: pre1880Year,
                intensity: 1,
                entityCount: maxCount,
                displayYear: "before 1880",
            });
        }

        points.sort((a, b) => a.year - b.year);

        const maxEntities = Math.max(...points.map(d => d.entityCount), 1);
        return points.map(item => ({
            ...item,
            fill: `rgba(72, 140, 204, ${0.2 + (item.entityCount - 1) * 0.8 / maxEntities})`,
        }));
    }, [data]);

    if (chartData.length === 0) return null;

    return (
        <div className="w-full">
            <div className="flex items-center gap-4 text-xs text-gray-500 px-5">
                <div className="flex items-center gap-1.5">
                    <div className="flex gap-px">
                        {[0.2, 0.4, 0.6, 0.8, 1.0].map((o, i) => (
                            <div key={i} className="w-2 h-3 rounded-sm" style={{ background: `rgba(72,140,204,${o})` }} />
                        ))}
                    </div>
                    <span>Fewer &rarr; More Entities</span>
                </div>
                <span className="ml-auto text-gray-400 italic">Hover a bar for details</span>
            </div>
            <div className="h-20">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={chartData}
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
                        name="Unique Entities"
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
