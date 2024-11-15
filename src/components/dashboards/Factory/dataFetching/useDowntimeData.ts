import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { calculateDuration } from '../components/utils';
import type { DowntimeData } from '../components/utils';

export interface DowntimeSummary extends DowntimeData {
    totalDuration: number;
}

export const useDowntimeData = (startDate: Date, endDate: Date) => {
    const [downtimeSummary, setDowntimeSummary] = useState<DowntimeSummary>({
        machineDowntimes: [],
        supplyDowntimes: [],
        styleChangeovers: [],
        totalDuration: 0
    });
    const [previousPeriodSummary, setPreviousPeriodSummary] = useState<DowntimeSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDowntimeData = async () => {
            try {
                console.log('Fetching data for period:', { startDate, endDate });

                const periodLength = endDate.getTime() - startDate.getTime();
                const previousStart = new Date(startDate.getTime() - periodLength);
                const previousEnd = new Date(endDate.getTime() - periodLength);

                const currentData = await fetchPeriodData(startDate, endDate);
                console.log('Current period data:', currentData);
                setDowntimeSummary(currentData);

                const previousData = await fetchPeriodData(previousStart, previousEnd);
                console.log('Previous period data:', previousData);
                setPreviousPeriodSummary(previousData);

                setLoading(false);
            } catch (error) {
                console.error('Error fetching downtime data:', error);
                setLoading(false);
            }
        };

        fetchDowntimeData();
    }, [startDate, endDate]);

    return { downtimeSummary, previousPeriodSummary, loading };
};

const fetchPeriodData = async (start: Date, end: Date): Promise<DowntimeSummary> => {
    const startTimestamp = Timestamp.fromDate(start);
    const endTimestamp = Timestamp.fromDate(end);

    console.log('Query timestamps:', { startTimestamp, endTimestamp });

    // Fetch machine downtimes
    const machineQuery = query(
        collection(db, 'machineDowntimes'),
        where('createdAt', '>=', startTimestamp),
        where('createdAt', '<=', endTimestamp)
    );

    let machineData = await getDocs(machineQuery);
    console.log('Machine data count:', machineData.size);

    const machineDowntimes = machineData.docs.map(doc => {
        const data = doc.data();
        console.log('Machine downtime document:', data);
        return {
            id: doc.id,
            type: 'Machine',
            category: data.category,
            machine: data.machine,
            reason: data.reason,
            startTime: data.startTime,
            endTime: data.endTime,
            repairStart: data.repairStart,
            repairEnd: data.repairEnd,
            responseTime: data.responseTime,
            comments: data.comments,
            userId: data.userId,
            employeeId: data.employeeId,
            status: data.status,
            productionLineId: data.productionLineId,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            supervisorId: data.supervisorId,
            mechanicId: data.mechanicId,
            mechanicReceivedTime: data.mechanicReceivedTime,
            sessionId: data.sessionId,
            refNumber: data.refNumber
        };
    });

    // Fetch supply downtimes
    const supplyQuery = query(
        collection(db, 'supplyDowntime'),
        where('startTime', '>=', startTimestamp),
        where('startTime', '<=', endTimestamp)
    );
    const supplyData = await getDocs(supplyQuery);
    const supplyDowntimes = supplyData.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            type: 'Supply',
            reason: data.reason,
            startTime: data.startTime,
            endTime: data.endTime,
            comments: data.comments,
            userId: data.userId,
            status: data.status,
            productionLineId: data.productionLineId
        };
    });

    // Fetch style changeovers
    const changeoverQuery = query(
        collection(db, 'styleChangeovers'),
        where('createdAt', '>=', startTimestamp),
        where('createdAt', '<=', endTimestamp)
    );
    const changeoverData = await getDocs(changeoverQuery);
    const styleChangeovers = changeoverData.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            currentStyle: data.currentStyle,
            nextStyle: data.nextStyle,
            target: data.target,
            productionLineId: data.productionLineId,
            supervisorId: data.supervisorId,
            createdAt: data.createdAt,
            closedAt: data.closedAt,
            status: data.status,
            completedBy: data.completedBy,
            progressSteps: data.progressSteps
        };
    });

    const totalDuration = [
        ...machineDowntimes.map(d => calculateDuration(d.startTime, d.endTime)),
        ...supplyDowntimes.map(d => calculateDuration(d.startTime, d.endTime)),
        ...styleChangeovers.map(d => calculateDuration(d.createdAt, d.closedAt))
    ].reduce((total, duration) => total + duration, 0);

    const result = {
        machineDowntimes,
        supplyDowntimes,
        styleChangeovers,
        totalDuration
    };

    return result;
};