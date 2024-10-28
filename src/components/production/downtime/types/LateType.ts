import { Timestamp } from 'firebase/firestore';

// ------------------------
// Form Data Interfaces
// ------------------------

export interface LateFormData {
    employeeId: string;
    reason?: string;
    date: Date;
    time: string;
    productionLineId: string;
    supervisorId: string;
    comments?: string;
}

// ------------------------
// Component Props Interfaces
// ------------------------

export interface LateProps {
    onClose: () => void;
    onSubmit: (data: LateFormData) => Promise<void>;
    productionLineId: string;
    supervisorId: string;
}

// ------------------------
// Document Interfaces
// ------------------------

export interface LateRecord {
    id: string;
    employeeId: string;
    reason?: string;
    date: Date;
    time: string;
    productionLineId: string;
    supervisorId: string;
    comments?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

