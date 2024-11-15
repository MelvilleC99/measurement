import { Timestamp } from 'firebase/firestore';
import { TrendData, ReasonBreakdown, calculateDuration, calculateTrend } from './sharedCalc';

export interface SupplyDowntimeStats {
    totalTime: number;
    averageTime: number;
    trends: {
        total: TrendData;
        average: TrendData;
    };
    topReasons: ReasonBreakdown[];
}

interface SupplyDowntime {
    reason: string;
    startTime: Timestamp;
    endTime: Timestamp;
}

interface ReasonGroup {
    totalTime: number;
    count: number;
}

export const calculateSupplyDowntimeStats = (
    currentDowntimes: SupplyDowntime[],
    previousDowntimes: SupplyDowntime[] = []
): SupplyDowntimeStats => {
    // Group by reason
    const reasonGroups = currentDowntimes.reduce((acc, downtime) => {
        const reason = downtime.reason || 'Unknown';
        if (!acc[reason]) {
            acc[reason] = { totalTime: 0, count: 0 };
        }
        acc[reason].totalTime += calculateDuration(downtime.startTime, downtime.endTime);
        acc[reason].count++;
        return acc;
    }, {} as Record<string, ReasonGroup>);

    // Previous period calculations
    const previousReasonGroups = previousDowntimes.reduce((acc, downtime) => {
        const reason = downtime.reason || 'Unknown';
        if (!acc[reason]) {
            acc[reason] = { totalTime: 0, count: 0 };
        }
        acc[reason].totalTime += calculateDuration(downtime.startTime, downtime.endTime);
        acc[reason].count++;
        return acc;
    }, {} as Record<string, ReasonGroup>);

    const totalTime = Object.values(reasonGroups).reduce((sum, group) => sum + group.totalTime, 0);
    const totalCount = Object.values(reasonGroups).reduce((sum, group) => sum + group.count, 0);
    const previousTotal = Object.values(previousReasonGroups).reduce((sum, group) => sum + group.totalTime, 0);
    const previousCount = Object.values(previousReasonGroups).reduce((sum, group) => sum + group.count, 0);

    // Top 5 reasons with trends
    const topReasons: ReasonBreakdown[] = Object.entries(reasonGroups)
        .map(([reason, data]) => ({
            reason,
            timeLost: data.totalTime,
            trend: calculateTrend(
                data.totalTime,
                previousReasonGroups[reason]?.totalTime || 0
            )
        }))
        .sort((a, b) => b.timeLost - a.timeLost)
        .slice(0, 5);

    return {
        totalTime,
        averageTime: totalCount ? totalTime / totalCount : 0,
        trends: {
            total: calculateTrend(totalTime, previousTotal),
            average: calculateTrend(
                totalCount ? totalTime / totalCount : 0,
                previousCount ? previousTotal / previousCount : 0
            )
        },
        topReasons
    };
};