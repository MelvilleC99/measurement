import { Timestamp } from 'firebase/firestore';

// ------------------------
// Form Data Interfaces
// ------------------------

export interface AbsentFormData {
    employeeId: string;
    reason: string;
    startDate: Date;
    endDate: Date;
    productionLineId: string;
    supervisorId: string;
}

export interface LateFormData {
    employeeId: string;
    reason: string;
    date: Date;
    time: string;
    productionLineId: string;
    supervisorId: string;
}

export interface ReworkFormData {
    reason: string;
    operation: string;
    comments: string;
    qcId: string;
    count: number;
    productionLineId: string;
    supervisorId: string;

}

export interface RejectFormData {
    reason: string;
    operation: string;
    comments: string;
    qcId: string;
    count: number;
    recordedAsProduced: boolean;
    productionLineId: string;
    supervisorId: string;
}

export interface MachineFormData {
    reason: string;
    machineNumber: string;
    comments: string;
    supervisorId: string;
    mechanicId?: string; // Make mechanicId optional
    productionLineId?: string;
}

export interface SupplyFormData {
    reason: string;
    comments: string;
    supervisorId: string;
    password: string;
    productionLineId: string;
}

export interface StyleChangeoverFormData {
    currentStyle: string;
    nextStyle: string;
    target: string;
    productionLineId: string;
    supervisorId: string;
    password: string;
}

// ------------------------
// Component Props Interfaces
// ------------------------

export interface MachineProps {
    onClose: () => void;
    onSubmit: (formData: MachineFormData) => Promise<void>;
    mechanics: SupportFunction[];
    supervisorId: string;
    productionLineId: string;
}

export interface RejectProps {
    onClose: () => void;
    onSubmit: (formData: RejectFormData) => Promise<void>;
    productionLineId: string;
    supervisorId: string;
    qcs: SupportFunction[];
}

export interface ReworkProps {
    onClose: () => void;
    onSubmit: (formData: ReworkFormData) => Promise<void>;
    productionLineId: string;
    supervisorId: string;
    qcs: SupportFunction[];
}

export interface StyleChangeProps {
    onClose: () => void;
    onSubmit: (formData: StyleChangeoverFormData) => Promise<void>;
    productionLineId: string;
    supervisorId: string;
}

// ------------------------
// Document Interfaces
// ------------------------

export interface ReworkItem {
    docId: string;
    count: number;
    reason: string;
    operation: string;
    startTime: Timestamp;
    endTime?: Timestamp;
    status: 'Booked Out' | 'Booked In' | 'Rejected';
    productionLineId: string;
    supervisorId: string;
    qcId: string;
    comments: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface RejectRecord {
    docId: string;
    count: number;
    reason: string;
    operation: string;
    recordedAsProduced: boolean;
    qcApprovedBy: string;
    productionLineId: string;
    supervisorId: string;
    comments: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface DowntimeBase {
    docId: string;
    type: string;
    category: string;
    machine?: string;
    createdAt: Timestamp;
    productionLineId: string;
    reason: string;
    startTime: Timestamp;
    status: 'Open' | 'Mechanic Received' | 'Resolved' | 'Closed' | 'InProgress' | 'Completed';
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
}

export interface DowntimeWithId extends Omit<DowntimeBase, 'docId'> {
    id: string;
}

export type Downtime = DowntimeBase;

// ------------------------
// Entity Interfaces
// ------------------------

export interface ProductionLine {
    id: string;
    name: string;
    description?: string;
    active: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface Style {
    id: string;
    styleNumber: string;
    styleName: string;
    description: string;
    unitsInOrder: number;
    deliveryDate: string;
    hourlyTarget: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface SupportFunction {
    id: string;
    name: string;
    surname: string;
    employeeNumber: string;
    role: 'Supervisor' | 'Mechanic' | 'QC';
    hasPassword: boolean;
    password: string;
    active: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface TimeSlot {
    id: string;
    startTime: string;
    endTime: string;
    breakId: string | null;
}

export interface Break {
    id: string;
    breakType: 'Lunch' | 'Tea';
    startTime: string;
    endTime: string;
    duration: number;
}

export interface TimeTable {
    id: string;
    name: string;
    lineId: string;
    slots: TimeSlot[];
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// ------------------------
// Helper Functions
// ------------------------

export const convertToDowntimeWithId = (doc: any): DowntimeWithId => {
    const data = doc.data();
    return {
        id: doc.id,
        type: data.type || '',
        category: data.category || '',
        createdAt: data.createdAt || Timestamp.now(),
        productionLineId: data.productionLineId || '',
        reason: data.reason || '',
        startTime: data.startTime || Timestamp.now(),
        status: data.status || 'Open',
        supervisorId: data.supervisorId || '',
        updatedAt: data.updatedAt || Timestamp.now(),
        machine: data.machine,
        currentStyle: data.currentStyle,
        nextStyle: data.nextStyle,
        target: data.target,
        endTime: data.endTime,
        comments: data.comments,
        mechanicId: data.mechanicId,
        qcId: data.qcId,
        mechanicReceivedTime: data.mechanicReceivedTime
    };
};

export const convertDateToTimestamp = (date: Date): Timestamp => {
    return Timestamp.fromDate(date);
};

export const convertTimestampToDate = (timestamp: Timestamp): Date => {
    return timestamp.toDate();
};