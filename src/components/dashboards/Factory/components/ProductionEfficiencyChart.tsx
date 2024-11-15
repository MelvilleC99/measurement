// ProductionEfficiencyChart.tsx

"use client"; // Ensure this is at the very top

import React from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../../../../styles/shadcn/ui/card";

interface ProductionEfficiencyData {
    name: string;
    efficiency: number;
}

interface ProductionEfficiencyChartProps {
    data: ProductionEfficiencyData[];
    className?: string;
}

const ProductionEfficiencyChart: React.FC<ProductionEfficiencyChartProps> = ({ data, className }) => {
    // Handle empty data
    if (data.length === 0) {
        return (
            <Card className={className}>
                <CardHeader>
                    <CardTitle>Production Efficiency</CardTitle>
                    <CardDescription>Current Period</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-gray-500">No data available</p>
                </CardContent>
            </Card>
        );
    }

    // Determine the maximum efficiency to scale the bars
    const maxEfficiency = Math.max(...data.map(line => line.efficiency));
    const scaleFactor = 300 / (maxEfficiency * 1.1); // Adding 10% padding for aesthetics

    return (
        <Card className={className}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Production Efficiency</CardTitle>
                        <CardDescription>Current Period</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col space-y-4">
                    {data.map((line, index) => {
                        // Calculate bar width with a minimum width for visibility
                        const barWidth = Math.max(line.efficiency * scaleFactor, 10); // Minimum 10px

                        // Determine bar color based on efficiency
                        const barColor = line.efficiency < 50 ? 'bg-red-500' : 'bg-green-500';

                        return (
                            <div key={index} className="flex items-center">
                                {/* Line Name */}
                                <div className="w-24 text-right mr-4 text-sm font-medium text-gray-700">
                                    {line.name}
                                </div>
                                {/* Bar Container */}
                                <div className="flex-1 bg-gray-200 rounded h-6 relative flex items-center">
                                    {/* Efficiency Bar */}
                                    <div
                                        className={`${barColor} h-6 rounded`}
                                        style={{ width: `${barWidth}px` }}
                                    ></div>
                                    {/* Efficiency Label */}
                                    <span className="ml-2 text-xs text-gray-700">
                                        {line.efficiency}%
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};

export default ProductionEfficiencyChart;
