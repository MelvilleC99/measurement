// src/components/dashboards/LiveProduction/components/Production/ProductionOverview.tsx

import React from "react";

interface ProductionOverviewProps {
    currentEfficiency: { [lineId: string]: number };
    cumulativeEfficiency: { [lineId: string]: number };
}

const ProductionOverview: React.FC<ProductionOverviewProps> = ({
                                                                   currentEfficiency,
                                                                   cumulativeEfficiency,
                                                               }) => {
    return (
        <div className="bg-white p-6 rounded shadow mb-6">
            <h2 className="text-2xl font-semibold mb-4">Production Efficiency Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Current Efficiency */}
                <div>
                    <h3 className="text-xl font-medium mb-2">Current Efficiency</h3>
                    <ul>
                        {Object.entries(currentEfficiency).map(([lineId, efficiency]) => (
                            <li key={lineId} className="mb-1">
                                <strong>Line {lineId}:</strong> {efficiency.toFixed(2)}%
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Cumulative Efficiency */}
                <div>
                    <h3 className="text-xl font-medium mb-2">Cumulative Efficiency</h3>
                    <ul>
                        {Object.entries(cumulativeEfficiency).map(([lineId, efficiency]) => (
                            <li key={lineId} className="mb-1">
                                <strong>Line {lineId}:</strong> {efficiency.toFixed(2)}%
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ProductionOverview;
