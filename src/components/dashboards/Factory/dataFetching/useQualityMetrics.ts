import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';

interface QualityIssue {
    reason: string;
    count: number;
    cost?: number;
    productType?: string;
    location?: string;
    repairTime?: number;
}

interface QualityMetrics {
    rejects: QualityIssue[];
    reworks: QualityIssue[];
    totalRejects: number;
    totalReworks: number;
    totalCost: number;
    averageRepairTime: number;
    totalRepairTime: number;
    productTypeBreakdown: {
        rejects: { [key: string]: number };
        reworks: { [key: string]: number };
    };
    locationBreakdown: {
        rejects: { [key: string]: number };
        reworks: { [key: string]: number };
    };
}

export const useQualityMetrics = (startDate: Date, endDate: Date) => {
    const [metrics, setMetrics] = useState<QualityMetrics>({
        rejects: [],
        reworks: [],
        totalRejects: 0,
        totalReworks: 0,
        totalCost: 0,
        averageRepairTime: 0,
        totalRepairTime: 0,
        productTypeBreakdown: { rejects: {}, reworks: {} },
        locationBreakdown: { rejects: {}, reworks: {} }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchQualityData = async () => {
            try {
                // Fetch style costs first
                const styleCosts = new Map<string, number>();
                const stylesSnapshot = await getDocs(collection(db, 'styles'));
                stylesSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    styleCosts.set(data.styleNumber, data.cost || 0);
                });

                // Fetch and process rejects
                const rejectsQuery = query(
                    collection(db, 'rejects'),
                    where('createdAt', '>=', Timestamp.fromDate(startDate)),
                    where('createdAt', '<=', Timestamp.fromDate(endDate))
                );
                const rejectsSnapshot = await getDocs(rejectsQuery);

                const rejectsByReason = new Map<string, QualityIssue>();
                let totalRejects = 0;
                let totalCost = 0;
                const rejectProductTypes: { [key: string]: number } = {};
                const rejectLocations: { [key: string]: number } = {};

                rejectsSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    const count = data.count || 0;
                    const styleCost = styleCosts.get(data.styleNumber) || 0;
                    const cost = count * styleCost;
                    const reason = data.reason || 'Unknown';
                    const productType = data.productType || 'Unknown';
                    const location = data.location || 'Unknown';

                    // Update reason aggregates
                    const current = rejectsByReason.get(reason) || {
                        reason,
                        count: 0,
                        cost: 0,
                        productType,
                        location
                    };
                    rejectsByReason.set(reason, {
                        ...current,
                        count: current.count + count,
                        cost: (current.cost || 0) + cost
                    });

                    // Update breakdowns
                    rejectProductTypes[productType] = (rejectProductTypes[productType] || 0) + count;
                    rejectLocations[location] = (rejectLocations[location] || 0) + count;

                    totalRejects += count;
                    totalCost += cost;
                });

                // Fetch and process reworks
                const reworksQuery = query(
                    collection(db, 'reworks'),
                    where('createdAt', '>=', Timestamp.fromDate(startDate)),
                    where('createdAt', '<=', Timestamp.fromDate(endDate))
                );
                const reworksSnapshot = await getDocs(reworksQuery);

                const reworksByReason = new Map<string, QualityIssue>();
                let totalReworks = 0;
                let totalRepairTime = 0;
                const reworkProductTypes: { [key: string]: number } = {};
                const reworkLocations: { [key: string]: number } = {};

                reworksSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    const count = data.count || 0;
                    const reason = data.reason || 'Unknown';
                    const productType = data.productType || 'Unknown';
                    const location = data.location || 'Unknown';
                    const repairTime = data.repairTime || 0;

                    const current = reworksByReason.get(reason) || {
                        reason,
                        count: 0,
                        repairTime: 0,
                        productType,
                        location
                    };
                    reworksByReason.set(reason, {
                        ...current,
                        count: current.count + count,
                        repairTime: (current.repairTime || 0) + repairTime
                    });

                    reworkProductTypes[productType] = (reworkProductTypes[productType] || 0) + count;
                    reworkLocations[location] = (reworkLocations[location] || 0) + count;

                    totalReworks += count;
                    totalRepairTime += repairTime;
                });

                const rejects = Array.from(rejectsByReason.values())
                    .sort((a, b) => b.count - a.count);

                const reworks = Array.from(reworksByReason.values())
                    .sort((a, b) => b.count - a.count);

                setMetrics({
                    rejects,
                    reworks,
                    totalRejects,
                    totalReworks,
                    totalCost,
                    averageRepairTime: totalReworks > 0 ? totalRepairTime / totalReworks : 0,
                    totalRepairTime,
                    productTypeBreakdown: {
                        rejects: rejectProductTypes,
                        reworks: reworkProductTypes
                    },
                    locationBreakdown: {
                        rejects: rejectLocations,
                        reworks: reworkLocations
                    }
                });

                setLoading(false);
            } catch (error) {
                console.error('Error fetching quality metrics:', error);
                setLoading(false);
            }
        };

        fetchQualityData();
    }, [startDate, endDate]);

    return { metrics, loading };
};