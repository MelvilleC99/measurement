import { Timestamp } from 'firebase/firestore';
import { calculateDuration, calculateTrend, TrendData, ReasonBreakdown } from './index';

export interface MachineDowntimeRecord {
    id: string;
    reason: string;
    additionalComments?: string;
    comments: string;
    machineNumber: string;
    productionLineId: string;
    supervisorId: string;
    mechanicId?: string;
    mechanicName?: string;
    status: 'Open' | 'Closed' | 'In Progress' | 'Mechanic Received' | 'Resolved';
    mechanicAcknowledged: boolean;
    createdAt: Timestamp;
    startTime?: Timestamp;
    endTime?: Timestamp;
    updatedAt: Timestamp;
    mechanicAcknowledgedAt?: Timestamp;
    resolvedAt?: Timestamp;
    refNumber?: string;
}

export interface MachineReasonGroup {
    totalTime: number;
    count: number;
    repairTime: number;
    responseTime: number;
}

export interface MachineDowntimeStats {
    totalTime: number;
    averageTime: number;
    averageRepair: number;
    averageResponse: number;
    trends: {
        total: TrendData;
        average: TrendData;
        repair: TrendData;
        response: TrendData;
    };
    topReasons: ReasonBreakdown[];
}

const safeCalculateDuration = (start?: Timestamp, end?: Timestamp): number => {
    if (!start || !end) return 0;
    return calculateDuration(start, end);
};

const calculateReasonGroups = (downtimes: MachineDowntimeRecord[]): Record<string, MachineReasonGroup> => {
    return downtimes.reduce((acc, downtime) => {
        const reason = downtime.reason || 'Unknown';
        if (!acc[reason]) {
            acc[reason] = {
                totalTime: 0,
                count: 0,
                repairTime: 0,
                responseTime: 0
            };
        }

        // Use createdAt as start time if startTime is not available
        const startTime = downtime.startTime || downtime.createdAt;
        // Use endTime, resolvedAt, or updatedAt as end time, in that order of preference
        const endTime = downtime.endTime || downtime.resolvedAt || (downtime.status === 'Closed' ? downtime.updatedAt : undefined);

        const duration = safeCalculateDuration(startTime, endTime);
        const repairTime = safeCalculateDuration(downtime.mechanicAcknowledgedAt, downtime.resolvedAt);
        const responseTime = safeCalculateDuration(startTime, downtime.mechanicAcknowledgedAt);

        acc[reason].totalTime += duration;
        acc[reason].count++;
        if (repairTime > 0) acc[reason].repairTime += repairTime;
        if (responseTime > 0) acc[reason].responseTime += responseTime;

        return acc;
    }, {} as Record<string, MachineReasonGroup>);
};

export const calculateMachineDowntimeStats = (
    currentDowntimes: MachineDowntimeRecord[],
    previousDowntimes: MachineDowntimeRecord[] = []
): MachineDowntimeStats => {
    // Calculate groups for both current and previous periods
    const reasonGroups = calculateReasonGroups(currentDowntimes);
    const previousReasonGroups = calculateReasonGroups(previousDowntimes);

    // Calculate totals for current period
    const totalTime = Object.values(reasonGroups).reduce((sum, group) => sum + group.totalTime, 0);
    const totalCount = Object.values(reasonGroups).reduce((sum, group) => sum + group.count, 0);
    const totalRepairTime = Object.values(reasonGroups).reduce((sum, group) => sum + group.repairTime, 0);
    const totalResponseTime = Object.values(reasonGroups).reduce((sum, group) => sum + group.responseTime, 0);

    // Calculate totals for previous period
    const previousTotal = Object.values(previousReasonGroups).reduce((sum, group) => sum + group.totalTime, 0);
    const previousCount = Object.values(previousReasonGroups).reduce((sum, group) => sum + group.count, 0);
    const previousRepairTotal = Object.values(previousReasonGroups).reduce((sum, group) => sum + group.repairTime, 0);
    const previousResponseTotal = Object.values(previousReasonGroups).reduce((sum, group) => sum + group.responseTime, 0);

    // Calculate top 5 reasons with trends
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

    // Calculate averages and trends
    return {
        totalTime,
        averageTime: totalCount ? totalTime / totalCount : 0,
        averageRepair: totalCount ? totalRepairTime / totalCount : 0,
        averageResponse: totalCount ? totalResponseTime / totalCount : 0,
        trends: {
            total: calculateTrend(totalTime, previousTotal),
            average: calculateTrend(
                totalCount ? totalTime / totalCount : 0,
                previousCount ? previousTotal / previousCount : 0
            ),
            repair: calculateTrend(
                totalCount ? totalRepairTime / totalCount : 0,
                previousCount ? previousRepairTotal / previousCount : 0
            ),
            response: calculateTrend(
                totalCount ? totalResponseTime / totalCount : 0,
                previousCount ? previousResponseTotal / previousCount : 0
            )
        },
        topReasons
    };
};