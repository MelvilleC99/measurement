import { Timestamp } from 'firebase/firestore';
import { SupportFunction } from '../../../../types'

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
    sessionId: string;
    styleNumber: string;
    status: string;
    createdAt?: Date;
    updatedAt?: Date;

}

// ------------------------
// Component Props Interfaces
// ------------------------

export interface RejectProps {
    onClose: () => void;
    onSubmit: (formData: RejectFormData) => Promise<void>;
    productionLineId: string;
    supervisorId: string;
    sessionId: string;
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
    qcId: string;
    productionLineId: string;
    supervisorId: string;
    sessionId: string;
    styleNumber: string;
    comments: string;
    status: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// ------------------------
// Update Props Interface
// ------------------------

export interface RejectUpdateProps {
    onClose: () => void;
    onUpdate?: () => void;
    lineId: string;
    supervisorId: string;
    sessionId: string;
}

// ------------------------
// Status Type
// ------------------------

export type RejectStatus = 'open' | 'perfect' | 'closed';