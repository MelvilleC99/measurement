// src/types/downtime/ReworkType.ts

import { Timestamp } from 'firebase/firestore';
import { SupportFunction } from '../../../../types'; // Import from src/types.ts

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
}

// ------------------------
// Component Props Interfaces
// ------------------------

export interface ReworkProps {
    onClose: () => void;
    onSubmit: (formData: ReworkFormData) => Promise<void>;
    productionLineId: string;
    supervisorId: string;
    qcs: SupportFunction[];
}

// ------------------------
// Document Interfaces
// ------------------------

export interface ReworkItem {
    id: string;
    refNumber?: string;
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

// ------------------------
// Base Interfaces
// ------------------------

export interface ReworkBase {
    id: string;
    reason: string;
    operation: string;
    comments: string;
    qcId: string;
    count: number;
    productionLineId: string;
    supervisorId: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
