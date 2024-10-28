// src/types/downtime/RejectType.ts

import { Timestamp } from 'firebase/firestore';
import { SupportFunction } from '../../../../types'; // Adjusted import path

// ------------------------
// Form Data Interfaces
// ------------------------

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

// ------------------------
// Component Props Interfaces
// ------------------------

export interface RejectProps {
    onClose: () => void;
    onSubmit: (formData: RejectFormData) => Promise<void>;
    productionLineId: string;
    supervisorId: string;
    qcs: SupportFunction[];
}

// ------------------------
// Document Interfaces
// ------------------------

export interface RejectRecord {
    id: string;
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