import { Timestamp } from 'firebase/firestore';
import { calculateDuration, calculateTrend, TrendData } from './index';

export interface StyleChangeoverStepTrends {
    overall: TrendData;
    machineSetup: TrendData;
    peopleAllocated: TrendData;
    firstOfLine: TrendData;
    qcApproved: TrendData;
}

export interface StyleChangeoverWithTrends {
    totalChangeovers: number;
    averageTime: number;
    machineSetupAvg: number;
    peopleAllocatedAvg: number;
    firstOfLineAvg: number;
    qcApprovedAvg: number;
    totalTime: number;
    trends: StyleChangeoverStepTrends;
}

interface CompletedBy {
    machineSetupComplete?: { timestamp: Timestamp };
    peopleAllocated?: { timestamp: Timestamp };
    firstUnitOffLine?: { timestamp: Timestamp };
    qcApproved?: { timestamp: Timestamp };
}

interface StyleChangeover {
    createdAt: Timestamp;
    closedAt: Timestamp;
    completedBy: CompletedBy;
}

type StepKey = keyof CompletedBy;

const calculateStepStats = (changeovers: StyleChangeover[], step: StepKey) => {
    let totalTime = 0;
    let count = 0;

    changeovers.forEach(changeover => {
        if (changeover.completedBy?.[step]?.timestamp && changeover.createdAt) {
            const previousStep = step === 'machineSetupComplete' ? 'createdAt' :
                step === 'peopleAllocated' ? 'machineSetupComplete' :
                    step === 'firstUnitOffLine' ? 'peopleAllocated' :
                        'firstUnitOffLine';

            const startTime = previousStep === 'createdAt' ?
                changeover.createdAt :
                changeover.completedBy[previousStep as StepKey]?.timestamp;

            if (startTime) {
                totalTime += calculateDuration(startTime, changeover.completedBy[step]!.timestamp);
                count++;
            }
        }
    });

    return count > 0 ? totalTime / count : 0;
};

export const calculateStyleChangeoverStats = (
    currentChangeovers: StyleChangeover[],
    previousChangeovers: StyleChangeover[] = []
): StyleChangeoverWithTrends => {
    const currentStats = {
        machineSetup: calculateStepStats(currentChangeovers, 'machineSetupComplete'),
        peopleAllocated: calculateStepStats(currentChangeovers, 'peopleAllocated'),
        firstOfLine: calculateStepStats(currentChangeovers, 'firstUnitOffLine'),
        qcApproved: calculateStepStats(currentChangeovers, 'qcApproved')
    };

    const previousStats = {
        machineSetup: calculateStepStats(previousChangeovers, 'machineSetupComplete'),
        peopleAllocated: calculateStepStats(previousChangeovers, 'peopleAllocated'),
        firstOfLine: calculateStepStats(previousChangeovers, 'firstUnitOffLine'),
        qcApproved: calculateStepStats(previousChangeovers, 'qcApproved')
    };

    const totalTime = currentChangeovers.reduce((sum, c) =>
        sum + calculateDuration(c.createdAt, c.closedAt), 0);
    const previousTotalTime = previousChangeovers.reduce((sum, c) =>
        sum + calculateDuration(c.createdAt, c.closedAt), 0);

    return {
        totalChangeovers: currentChangeovers.length,
        averageTime: currentChangeovers.length ? totalTime / currentChangeovers.length : 0,
        machineSetupAvg: currentStats.machineSetup,
        peopleAllocatedAvg: currentStats.peopleAllocated,
        firstOfLineAvg: currentStats.firstOfLine,
        qcApprovedAvg: currentStats.qcApproved,
        totalTime,
        trends: {
            overall: calculateTrend(totalTime, previousTotalTime),
            machineSetup: calculateTrend(currentStats.machineSetup, previousStats.machineSetup),
            peopleAllocated: calculateTrend(currentStats.peopleAllocated, previousStats.peopleAllocated),
            firstOfLine: calculateTrend(currentStats.firstOfLine, previousStats.firstOfLine),
            qcApproved: calculateTrend(currentStats.qcApproved, previousStats.qcApproved)
        }
    };
};