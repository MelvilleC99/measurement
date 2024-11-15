import { Timestamp } from 'firebase/firestore';
import type {
    StyleChangeoverWithTrends,
    StyleChangeoverStepTrends,
} from './styleChangeoverCalc';

import type {
    MachineDowntimeStats
} from './machineDowntimeCalc';

import type {
    SupplyDowntimeStats
} from './supplyDowntimeCalc';

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

export const calculateDuration = (start: Timestamp, end?: Timestamp): number => {
    if (!start || !end) return 0;
    return (end.toMillis() - start.toMillis()) / (1000 * 60);
};

export const minutesToHours = (minutes: number): string => {
    return (minutes / 60).toFixed(1);
};

export const calculateTrend = (current: number, previous: number): TrendData => {
    if (!previous) {
        return { currentValue: current, previousValue: 0, trend: 0, direction: 'none' };
    }
    const trend = ((current - previous) / previous) * 100;
    return {
        currentValue: current,
        previousValue: previous,
        trend,
        direction: trend > 0 ? 'up' : trend < 0 ? 'down' : 'none'
    };
};

export { calculateDowntimeSummary } from './downtimeCalculations';
export { calculateMachineDowntimeStats } from './machineDowntimeCalc';
export { calculateSupplyDowntimeStats } from './supplyDowntimeCalc';
export { calculateStyleChangeoverStats } from './styleChangeoverCalc';
export type { StyleChangeoverWithTrends, StyleChangeoverStepTrends };
export type { MachineDowntimeStats };
export type { SupplyDowntimeStats };