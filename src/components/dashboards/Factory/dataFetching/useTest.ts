// src/dataFetching/useTest.ts

import { useState, useEffect } from 'react';
import Papa from 'papaparse';

// Define the shape of your raw CSV data
interface RawProductionData {
    lineId: string;
    lineName: string; // New field
    timestamp: string; // CSV provides timestamp as string
    unitProduced: number;
    target: number;
    sessionId: string;
    slotId: string;
}

// Define the processed production data with Date objects
interface ProductionData {
    lineId: string;
    lineName: string; // Included in processed data
    timestamp: Date;
    unitProduced: number;
    target: number;
    sessionId: string;
    slotId: string;
}

// Export the ProductionLine interface
export interface ProductionLine {
    id: string;
    name: string;
    totalProduced: number;
    totalTarget: number;
    efficiency: number;
    status: 'Overachieved' | 'On Track' | 'At Risk' | 'Behind';
}

type TimePeriod = 'today' | 'week' | 'month' | 'quarter' | 'janToMar';

// Hook to fetch and process production data from CSV
export const useTest = (timePeriod: TimePeriod) => {
    const [productionData, setProductionData] = useState<ProductionLine[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCSVData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch the CSV file from the public folder
                const response = await fetch('/production_data_3months.csv');
                if (!response.ok) {
                    throw new Error('Failed to fetch CSV data');
                }
                const csvText = await response.text();

                // Parse CSV data
                const parsedData = Papa.parse<RawProductionData>(csvText, {
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true,
                });

                if (parsedData.errors.length) {
                    console.error('CSV Parsing Errors:', parsedData.errors);
                    throw new Error('Error parsing CSV data');
                }

                // Convert timestamp strings to Date objects
                const productions: ProductionData[] = parsedData.data.map((prod) => ({
                    ...prod,
                    timestamp: new Date(prod.timestamp), // Convert string to Date
                }));

                // Calculate startDate and endDate based on timePeriod
                const endDate = new Date();
                const startDate = new Date();

                switch (timePeriod) {
                    case 'today':
                        startDate.setHours(0, 0, 0, 0);
                        break;
                    case 'week':
                        startDate.setDate(endDate.getDate() - 7);
                        break;
                    case 'month':
                        startDate.setMonth(endDate.getMonth() - 1);
                        break;
                    case 'quarter':
                        startDate.setMonth(endDate.getMonth() - 3);
                        break;
                    case 'janToMar':
                        startDate.setMonth(0); // January
                        startDate.setDate(1);
                        endDate.setMonth(2); // March
                        endDate.setDate(31);
                        break;
                }

                // Filter productions based on the date range
                const filteredProductions = productions.filter((prod) => {
                    const timestamp = prod.timestamp;
                    return timestamp >= startDate && timestamp <= endDate;
                });

                // Calculate line performance
                const linePerformance = calculateLinePerformance(filteredProductions);
                setProductionData(linePerformance);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching production data:', err);
                setError(err instanceof Error ? err.message : 'An error occurred');
                setLoading(false);
            }
        };

        fetchCSVData();
    }, [timePeriod]);

    return { productionData, loading, error };
};

// Function to calculate performance metrics for each production line
const calculateLinePerformance = (productions: ProductionData[]): ProductionLine[] => {
    const linesMap: { [key: string]: { name: string; totalProduced: number; totalTarget: number } } = {};

    productions.forEach((prod) => {
        if (!linesMap[prod.lineId]) {
            linesMap[prod.lineId] = { name: prod.lineName, totalProduced: 0, totalTarget: 0 };
        }
        linesMap[prod.lineId].totalProduced += prod.unitProduced;
        linesMap[prod.lineId].totalTarget += prod.target;
    });

    // Convert the map to an array of ProductionLine objects
    const productionLines: ProductionLine[] = Object.keys(linesMap).map((lineId) => {
        const { name, totalProduced, totalTarget } = linesMap[lineId];
        const efficiency = totalTarget > 0 ? parseFloat(((totalProduced / totalTarget) * 100).toFixed(2)) : 0;
        let status: 'Overachieved' | 'On Track' | 'At Risk' | 'Behind' = 'On Track';

        if (efficiency >= 100) {
            status = 'Overachieved';
        } else if (efficiency >= 90) {
            status = 'On Track';
        } else if (efficiency >= 80) {
            status = 'At Risk';
        } else {
            status = 'Behind';
        }

        return {
            id: lineId,
            name, // Use the actual line name from CSV
            totalProduced,
            totalTarget,
            efficiency,
            status,
        };
    });

    return productionLines;
};
