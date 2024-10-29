import { Timestamp } from 'firebase/firestore';

// ------------------------
// Form Data Interfaces
// ------------------------

export interface SupplyFormData {
    reason: string;
    comments: string;
    productionLineId: string;
    supervisorId: string;
}

// ------------------------
// Component Props Interfaces
// ------------------------

export interface SupplyLogProps {
    onClose: () => void;
    onSubmit: (formData: SupplyFormData) => Promise<void>;
    productionLineId: string;
    supervisorId: string;
}

export interface SupplyUpdateProps {
    userRole: 'Supervisor';
    userId: string;
    selectedDowntime: SupplyRecord | null;
    onClose: () => void;
}

// ------------------------
// Document Interface
// ------------------------

export interface SupplyRecord {
    id: string;
    reason: string;
    comments: string;
    productionLineId: string;
    supervisorId: string;
    type: 'Supply';
    category: 'Supply';
    status: 'Open' | 'Closed';
    sessionId: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    startTime: Timestamp;
    endTime?: Timestamp;
    resolvedAt?: Timestamp;
    additionalComments?: string;
}