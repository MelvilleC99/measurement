import { Timestamp } from 'firebase/firestore';

/**
 * Interface for all downtime types
 */
export interface Downtime {
    id: string;
    type: 'reject' | 'rework' | 'late' | 'absent' | 'machine' | 'supply' | 'style' | 'generic';
    category: string;
    machine?: string;
    supplier?: string;
    supplyId?: string;
    employeeId: string;
    createdAt: Timestamp;
    productionLineId: string;
    reason: string;
    startTime: Timestamp;
    status:
        | 'Open'
        | 'Closed'
        | 'In Progress'
        | 'Booked Out'
        | 'Booked In'
        | 'Rejected'
        | 'InProgress'
        | 'Completed'
        | 'arrived'
        | 'absent'
        | 'Mechanic Received'
        | 'Resolved';
    supervisorId: string;
    updatedAt: Timestamp;
    currentStyle?: string;
    nextStyle?: string;
    target?: string;
    endTime?: Timestamp;
    comments?: string;
    mechanicId?: string;
    qcId?: string;
    mechanicReceivedTime?: Timestamp;
    confirmedAt?: Timestamp;
    movedToAbsentAt?: Timestamp;
    sessionId?: string;
    refNumber?: string;
    progressSteps?: {
        machineSetupComplete: boolean;
        peopleAllocated: boolean;
        firstUnitOffLine: boolean;
        qcApproved: boolean;
    };
}


/**
 * Extended interface including the ID (alias for convenience if needed)
 */
export interface DowntimeWithId extends Downtime {}