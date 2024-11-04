import { Timestamp } from 'firebase/firestore';
import { SupportFunction } from '../../../../types';

// ------------------------
// Form Data Interfaces
// ------------------------

export interface ReworkFormData {
    reason: string;
    operation: string;
    comments: string;
    qcId: string;
    count: number;
    productionLineId: string;
    supervisorId: string;
    sessionId: string;
    styleNumber: string;
    status: string;
    createdAt?: Date;
    updatedAt?: Date;
    itemId?: string;
}

// ------------------------
// Component Props Interfaces
// ------------------------

export interface ReworkProps {
    onClose: () => void;
    onSubmit: (formData: ReworkFormData) => Promise<void>;
    productionLineId: string;
    supervisorId: string;
    sessionId: string;
    qcs: SupportFunction[];
}

// ------------------------
// Document Interfaces
// ------------------------

export interface ReworkRecord {
    id: string;
    itemId: string;
    count: number;
    reason: string;
    operation: string;
    qcId: string;
    productionLineId: string;
    supervisorId: string;
    sessionId: string;
    styleNumber: string;
    status: string;
    comments: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// Add this interface for backward compatibility
export interface ReworkItem extends ReworkRecord {
    refNumber?: string;
    startTime?: Timestamp;
    endTime?: Timestamp;
}

// ------------------------
// Update Props Interface
// ------------------------

export interface ReworkUpdateProps {
    onClose: () => void;
    onUpdate?: () => void;
    lineId: string;
    supervisorId: string;
    sessionId: string;
}

// ------------------------
// Status Type
// ------------------------

export type ReworkStatus = 'open' | 'closed';