// src/components/TrendBar.tsx
"use client";

import React, { useState, useMemo, FC } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    XAxis,
    Tooltip,
    ResponsiveContainer,
    TooltipProps,
} from "recharts";

// Define the structure of your chart data
interface ChartData {
    date: string;
    desktop: number;
    mobile: number;
}

// Define the structure of your chart configuration
interface ChartConfigType {
    views: {
        label: string;
    };
    desktop: {
        label: string;
        color: string;
    };
    mobile: {
        label: string;
        color: string;
    };
}

// Define a union type for chart keys to ensure type safety
type ChartKey = "desktop" | "mobile";

// Your chart data
const chartData: ChartData[] = [
    { date: "2024-04-01", desktop: 222, mobile: 150 },
    { date: "2024-04-02", desktop: 97, mobile: 180 },
    // ... (add all other data points here)
    { date: "2024-06-30", desktop: 446, mobile: 400 },
];

// Your chart configuration
const chartConfig: ChartConfigType = {
    views: {
        label: "Page Views",
    },
    desktop: {
        label: "Desktop",
        color: "hsl(var(--chart-1))",
    },
    mobile: {
        label: "Mobile",
        color: "hsl(var(--chart-2))",
    },
};

// Define props for Card components
interface CardProps {
    children: React.ReactNode;
    className?: string;
}

interface CardHeaderProps {
    children: React.ReactNode;
    className?: string;
}

interface CardTitleProps {
    children: React.ReactNode;
}

interface CardDescriptionProps {
    children: React.ReactNode;
}

interface CardContentProps {
    children: React.ReactNode;
    className?: string;
}

// Card component
const Card: FC<CardProps> = ({ children, className }) => (
    <div className={`bg-white shadow rounded-lg overflow-hidden ${className}`}>
        {children}
    </div>
);

// CardHeader component
const CardHeader: FC<CardHeaderProps> = ({ children, className }) => (
    <div className={`border-b p-4 sm:p-6 ${className}`}>{children}</div>
);

// CardTitle component
const CardTitle: FC<CardTitleProps> = ({ children }) => (
    <h2 className="text-lg font-semibold">{children}</h2>
);

// CardDescription component
const CardDescription: FC<CardDescriptionProps> = ({ children }) => (
    <p className="text-sm text-gray-500">{children}</p>
);

// CardContent component
const CardContent: FC<CardContentProps> = ({ children, className }) => (
    <div className={`p-4 sm:p-6 ${className}`}>{children}</div>
);

// Define the type for CustomTooltip props based on Recharts
interface CustomTooltipProps extends TooltipProps<number, string> {}

// CustomTooltip component
const CustomTooltip: FC<CustomTooltipProps> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const date = new Date(label).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
        return (
            <div className="bg-white border border-gray-300 p-2 rounded shadow">
                <p className="text-sm font-semibold">{date}</p>
                {payload.map((entry, index) => (
                    <p key={index} style={{ color: entry.color }} className="text-xs">
                        {entry.name}: {entry.value !== undefined ? entry.value.toLocaleString() : '0'}
                    </p>
                ))}
            </div>
        );
    }

    return null;
};

// TrendBar component
export const TrendBar: FC = () => {
    const [activeChart, setActiveChart] = useState<ChartKey>("desktop");

    // Calculate total visitors for desktop and mobile
    const total = useMemo(
        () => ({
            desktop: chartData.reduce((acc, curr) => acc + curr.desktop, 0),
            mobile: chartData.reduce((acc, curr) => acc + curr.mobile, 0),
        }),
        []
    );

    return (
        <Card>
            <CardHeader className="flex flex-col sm:flex-row items-stretch">
                <div className="flex-1 flex flex-col justify-center gap-1">
                    <CardTitle>Bar Chart - Interactive</CardTitle>
                    <CardDescription>
                        Showing total visitors for the last 3 months
                    </CardDescription>
                </div>
                <div className="flex mt-4 sm:mt-0 sm:ml-4">
                    {(["desktop", "mobile"] as ChartKey[]).map((chart) => (
                        <button
                            key={chart}
                            data-active={activeChart === chart}
                            className={`flex flex-1 flex-col justify-center gap-1 border-t px-4 py-2 text-left
                ${
                                activeChart === chart
                                    ? "bg-gray-100"
                                    : "bg-white hover:bg-gray-50"
                            }
                sm:border-l sm:border-t-0 sm:px-6 sm:py-3`}
                            onClick={() => setActiveChart(chart)}
                        >
              <span className="text-xs text-gray-500">
                {chartConfig[chart].label}
              </span>
                            <span className="text-lg font-bold leading-none sm:text-2xl">
                {total[chart].toLocaleString()}
              </span>
                        </button>
                    ))}
                </div>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={32}
                            tickFormatter={(value: string) => {
                                const date = new Date(value);
                                return date.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                });
                            }}
                        />
                        <Tooltip content={CustomTooltip} />
                        <Bar
                            dataKey={activeChart}
                            fill={chartConfig[activeChart].color}
                            barSize={20}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};
