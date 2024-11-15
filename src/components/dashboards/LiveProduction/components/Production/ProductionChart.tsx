// src/components/dashboards/LiveProduction/components/Production/ProductionChart.tsx

import React from "react"; // Ensure React is imported
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

interface ProductionChartProps {
    currentEfficiency: { [lineId: string]: number };
    cumulativeEfficiency: { [lineId: string]: number };
}

interface ChartData {
    lineId: string;
    Current: number;
    Cumulative: number;
}

const ProductionChart: React.FC<ProductionChartProps> = ({
                                                             currentEfficiency,
                                                             cumulativeEfficiency,
                                                         }) => {
    // Combine current and cumulative efficiency into chart data
    const chartData: ChartData[] = Object.keys(currentEfficiency).map((lineId) => ({
        lineId,
        Current: parseFloat(currentEfficiency[lineId].toFixed(2)),
        Cumulative: parseFloat(cumulativeEfficiency[lineId].toFixed(2)),
    }));

    return (
        <div className="bg-white p-6 rounded shadow">
            <h2 className="text-2xl font-semibold mb-4">Efficiency Comparison</h2>
            {chartData.length === 0 ? (
                <p>No data available for chart.</p>
            ) : (
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                        <XAxis dataKey="lineId" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Current" fill="#82ca9d" />
                        <Bar dataKey="Cumulative" fill="#8884d8" />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    );
};

export default ProductionChart;
