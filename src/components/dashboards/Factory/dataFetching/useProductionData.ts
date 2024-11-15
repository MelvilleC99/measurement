// useProductionData.ts

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase'; // Adjust the import path as needed

export interface ProductionData {
    lineId: string;
    timestamp: Timestamp;
    unitProduced: number;
    target: number;
    sessionId: string;
    slotId: string;
}

export interface ProductionEfficiencyData {
    name: string;
    efficiency: number;
}

export const useProductionData = (timePeriod: 'today' | 'week' | 'month' | 'quarter') => {
    const [productionData, setProductionData] = useState<ProductionEfficiencyData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchProductionData = async () => {
            setLoading(true);
            try {
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
                }

                // Fetch production records within the selected time period
                const productionQuery = query(
                    collection(db, 'production'),
                    where('timestamp', '>=', Timestamp.fromDate(startDate)),
                    where('timestamp', '<=', Timestamp.fromDate(endDate))
                );

                const productionSnapshot = await getDocs(productionQuery);
                const productions: ProductionData[] = productionSnapshot.docs.map(doc => doc.data() as ProductionData);

                console.log('Fetched Productions:', productions); // Debugging log

                // Calculate total produced and target per line
                const efficiencyMap: { [lineId: string]: { totalProduced: number; totalTarget: number } } = {};

                productions.forEach(prod => {
                    if (!efficiencyMap[prod.lineId]) {
                        efficiencyMap[prod.lineId] = { totalProduced: 0, totalTarget: 0 };
                    }
                    efficiencyMap[prod.lineId].totalProduced += prod.unitProduced;
                    efficiencyMap[prod.lineId].totalTarget += prod.target;
                });

                console.log('Efficiency Map:', efficiencyMap); // Debugging log

                // Calculate efficiency percentages
                const efficiencyData: ProductionEfficiencyData[] = Object.entries(efficiencyMap).map(([lineId, data]) => ({
                    name: lineId, // Temporary name; will be replaced with actual line names
                    efficiency: data.totalTarget > 0 ? (data.totalProduced / data.totalTarget) * 100 : 0,
                }));

                console.log('Efficiency Data Before Name Mapping:', efficiencyData); // Debugging log

                // Fetch production line names
                const linesSnapshot = await getDocs(collection(db, 'productionLines'));
                const lineNamesMap: { [id: string]: string } = {};
                linesSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    lineNamesMap[doc.id] = data.name || `Line ${doc.id}`;
                });

                console.log('Line Names Map:', lineNamesMap); // Debugging log

                // Replace line IDs with actual names
                const finalEfficiencyData: ProductionEfficiencyData[] = efficiencyData.map(data => ({
                    name: lineNamesMap[data.name] || data.name, // Use the name from productionLines or fallback to ID
                    efficiency: parseFloat(data.efficiency.toFixed(1)), // Round to one decimal place
                }));

                console.log('Final Production Efficiency Data:', finalEfficiencyData); // Debugging log

                setProductionData(finalEfficiencyData);
            } catch (error) {
                console.error('Error fetching production data:', error);
                setProductionData([]); // Optionally, set to empty array on error
            } finally {
                setLoading(false);
            }
        };

        fetchProductionData();
    }, [timePeriod]);

    return { productionData, loading };
};
