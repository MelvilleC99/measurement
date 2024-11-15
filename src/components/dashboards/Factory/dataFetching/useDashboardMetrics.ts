import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';

export interface DashboardMetrics {
    overallEfficiency: number;
    totalDowntime: number;
    budgetRecovery: number;
    attendanceIssues: number;
    qualityIssues: {
        total: number;
        cost: number;
    };
}

export const useDashboardMetrics = (startDate: Date, endDate: Date) => {
    const [metrics, setMetrics] = useState<DashboardMetrics>({
        overallEfficiency: 0,
        totalDowntime: 0,
        budgetRecovery: 0,
        attendanceIssues: 0,
        qualityIssues: {
            total: 0,
            cost: 0
        }
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                // Fetch downtimes
                const machineDowntimes = query(
                    collection(db, 'machineDowntimes'),
                    where('createdAt', '>=', Timestamp.fromDate(startDate)),
                    where('createdAt', '<=', Timestamp.fromDate(endDate))
                );
                const machineDowntimeSnapshot = await getDocs(machineDowntimes);

                const supplyDowntimes = query(
                    collection(db, 'supplyDowntime'),
                    where('createdAt', '>=', Timestamp.fromDate(startDate)),
                    where('createdAt', '<=', Timestamp.fromDate(endDate))
                );
                const supplyDowntimeSnapshot = await getDocs(supplyDowntimes);

                // Calculate total downtime
                const totalDowntime = [...machineDowntimeSnapshot.docs, ...supplyDowntimeSnapshot.docs]
                    .reduce((total, doc) => {
                        const data = doc.data();
                        if (data.endTime && data.startTime) {
                            const start = data.startTime.toDate();
                            const end = data.endTime.toDate();
                            return total + (end.getTime() - start.getTime()) / (1000 * 60); // Convert to minutes
                        }
                        return total;
                    }, 0);

                // Fetch attendance issues
                const attendanceQuery = query(
                    collection(db, 'attendance'),
                    where('startDate', '>=', Timestamp.fromDate(startDate)),
                    where('endDate', '<=', Timestamp.fromDate(endDate)),
                    where('status', 'in', ['Late', 'Absent'])
                );
                const attendanceSnapshot = await getDocs(attendanceQuery);
                const attendanceIssues = attendanceSnapshot.size;

                // Fetch quality issues
                const rejectsQuery = query(
                    collection(db, 'rejects'),
                    where('createdAt', '>=', Timestamp.fromDate(startDate)),
                    where('createdAt', '<=', Timestamp.fromDate(endDate))
                );
                const rejectsSnapshot = await getDocs(rejectsQuery);

                const reworksQuery = query(
                    collection(db, 'reworks'),
                    where('createdAt', '>=', Timestamp.fromDate(startDate)),
                    where('createdAt', '<=', Timestamp.fromDate(endDate))
                );
                const reworksSnapshot = await getDocs(reworksQuery);

                // Calculate quality metrics
                let totalQualityIssues = rejectsSnapshot.size + reworksSnapshot.size;
                let qualityCost = 0;

                // Calculate reject costs
                for (const doc of rejectsSnapshot.docs) {
                    const rejectData = doc.data();
                    const styleQuery = query(
                        collection(db, 'styles'),
                        where('styleNumber', '==', rejectData.styleNumber)
                    );
                    const styleSnapshot = await getDocs(styleQuery);
                    if (!styleSnapshot.empty) {
                        const styleData = styleSnapshot.docs[0].data();
                        qualityCost += (rejectData.count || 0) * (styleData.cost || 0);
                    }
                }

                setMetrics({
                    overallEfficiency: 0, // This will be calculated in the component using production data
                    totalDowntime,
                    budgetRecovery: qualityCost, // Using quality cost as budget impact
                    attendanceIssues,
                    qualityIssues: {
                        total: totalQualityIssues,
                        cost: qualityCost
                    }
                });

                setLoading(false);
            } catch (err) {
                console.error('Error fetching dashboard metrics:', err);
                setError(err instanceof Error ? err.message : 'An error occurred');
                setLoading(false);
            }
        };

        fetchMetrics();
    }, [startDate, endDate]);

    return { metrics, loading, error };
};