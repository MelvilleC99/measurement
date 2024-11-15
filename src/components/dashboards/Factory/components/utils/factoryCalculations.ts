import { Timestamp } from 'firebase/firestore';

// Types
export interface ProductionData {
    lineId: string;
    timestamp: Timestamp;
    unitProduced: number;
    target: number;
    sessionId: string;
    slotId: string;
}

export interface ProductionLine {
    id: string;
    name: string;
    totalProduced: number;
    totalTarget: number;
    efficiency: number;
    status: 'On Track' | 'At Risk' | 'Behind';
}

export interface DashboardMetrics {
    overallEfficiency: number;
    totalDowntime: number;
    budgetRecovery: number;
    attendanceIssues: number;
    qualityIssues: number;
}

// Helper function to calculate time-based efficiency
export const calculateTimeBasedEfficiency = (
    unitProduced: number,
    targetPerHour: number,
    slotStartTime: Date | null,
    currentTime: Date = new Date()
): number => {
    if (!slotStartTime) return 0;

    try {
        const minutesElapsed = (currentTime.getTime() - slotStartTime.getTime()) / (1000 * 60);
        if (minutesElapsed <= 0) return 0;

        const targetPerMinute = targetPerHour / 60;
        const expectedUnits = targetPerMinute * minutesElapsed;
        const efficiency = expectedUnits > 0 ? (unitProduced / expectedUnits) * 100 : 0;

        return Math.min(Math.max(efficiency, 0), 100);
    } catch (error) {
        console.error('Error calculating time-based efficiency:', error);
        return 0;
    }
};

// Calculate factory performance metrics per line
export const calculateLinePerformance = (
    productions: ProductionData[],
    startDate: Date,
    endDate: Date
): ProductionLine[] => {
    // Group production data by line
    const lineProductions = productions.reduce((acc, prod) => {
        const { lineId, unitProduced, target } = prod;
        if (!acc[lineId]) {
            acc[lineId] = { totalProduced: 0, totalTarget: 0 };
        }
        acc[lineId].totalProduced += unitProduced;
        acc[lineId].totalTarget += target;
        return acc;
    }, {} as Record<string, { totalProduced: number; totalTarget: number }>);

    // Calculate efficiency and status for each line
    return Object.entries(lineProductions).map(([lineId, data]) => {
        const efficiency = data.totalTarget > 0
            ? (data.totalProduced / data.totalTarget) * 100
            : 0;

        return {
            id: lineId,
            name: `Line ${lineId}`, // This should be replaced with actual line name from DB
            totalProduced: data.totalProduced,
            totalTarget: data.totalTarget,
            efficiency,
            status: getLineStatus(efficiency)
        };
    });
};

// Determine line status based on efficiency
export const getLineStatus = (efficiency: number): 'On Track' | 'At Risk' | 'Behind' => {
    if (efficiency >= 90) return 'On Track';
    if (efficiency >= 75) return 'At Risk';
    return 'Behind';
};

// Calculate overall dashboard metrics
export const calculateDashboardMetrics = (
    productions: ProductionData[],
    downtimes: any[], // Replace with proper downtime interface
    attendance: any[], // Replace with proper attendance interface
    quality: any[], // Replace with proper quality interface
    startDate: Date,
    endDate: Date
): DashboardMetrics => {
    // Calculate overall efficiency
    const totalProduced = productions.reduce((sum, prod) => sum + prod.unitProduced, 0);
    const totalTarget = productions.reduce((sum, prod) => sum + prod.target, 0);
    const overallEfficiency = totalTarget > 0 ? (totalProduced / totalTarget) * 100 : 0;

    // Calculate total downtime (in minutes)
    const totalDowntime = downtimes.reduce((sum, downtime) => {
        // Add proper downtime duration calculation based on your data structure
        return sum + 0; // Placeholder
    }, 0);

    // Other metrics calculations to be implemented based on data structure
    return {
        overallEfficiency,
        totalDowntime,
        budgetRecovery: 0, // Implement calculation
        attendanceIssues: 0, // Implement calculation
        qualityIssues: 0, // Implement calculation
    };
};