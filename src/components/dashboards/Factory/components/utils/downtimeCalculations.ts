import { Timestamp } from 'firebase/firestore';
import { calculateDuration, calculateTrend } from './index';

export interface TrendData {
    currentValue: number;
    previousValue: number;
    trend: number;
    direction: 'up' | 'down' | 'none';
}

export interface ReasonBreakdown {
    reason: string;
    timeLost: number;
    trend: TrendData;
}

export interface DowntimeData {
    machineDowntimes: any[];
    supplyDowntimes: any[];
    styleChangeovers: any[];
}

export interface DowntimeSummary {
    machineTotal: number;
    supplyTotal: number;
    changeoverTotal: number;
    totalDowntime: number;
    trends: {
        machine: TrendData;
        supply: TrendData;
        changeover: TrendData;
        total: TrendData;
    };
    distribution: {
        name: string;
        value: number;
        percentage: number;
    }[];
}

export const calculateDowntimeSummary = (
    current: DowntimeData,
    previous?: DowntimeData
): DowntimeSummary => {
    const machineTotal = current.machineDowntimes.reduce((sum, d) =>
        sum + calculateDuration(d.startTime, d.endTime), 0);
    const supplyTotal = current.supplyDowntimes.reduce((sum, d) =>
        sum + calculateDuration(d.startTime, d.endTime), 0);
    const changeoverTotal = current.styleChangeovers.reduce((sum, d) =>
        sum + calculateDuration(d.createdAt, d.closedAt), 0);

    const previousMachineTotal = previous?.machineDowntimes.reduce((sum, d) =>
        sum + calculateDuration(d.startTime, d.endTime), 0) || 0;
    const previousSupplyTotal = previous?.supplyDowntimes.reduce((sum, d) =>
        sum + calculateDuration(d.startTime, d.endTime), 0) || 0;
    const previousChangeoverTotal = previous?.styleChangeovers.reduce((sum, d) =>
        sum + calculateDuration(d.createdAt, d.closedAt), 0) || 0;

    const totalDowntime = machineTotal + supplyTotal + changeoverTotal;
    const previousTotal = previousMachineTotal + previousSupplyTotal + previousChangeoverTotal;

    return {
        machineTotal,
        supplyTotal,
        changeoverTotal,
        totalDowntime,
        trends: {
            machine: calculateTrend(machineTotal, previousMachineTotal),
            supply: calculateTrend(supplyTotal, previousSupplyTotal),
            changeover: calculateTrend(changeoverTotal, previousChangeoverTotal),
            total: calculateTrend(totalDowntime, previousTotal)
        },
        distribution: [
            {
                name: 'Machine',
                value: machineTotal,
                percentage: (machineTotal / totalDowntime) * 100
            },
            {
                name: 'Supply',
                value: supplyTotal,
                percentage: (supplyTotal / totalDowntime) * 100
            },
            {
                name: 'Changeover',
                value: changeoverTotal,
                percentage: (changeoverTotal / totalDowntime) * 100
            }
        ]
    };
};