// src/types/downtime/AbsentType.ts

import { Timestamp } from 'firebase/firestore';

// ------------------------
// Form Data Interfaces
// ------------------------

export interface AbsentFormData {
    employeeId: string;
    reason?: string;
    startDate: Date;
    endDate: Date;
    productionLineId: string;
    supervisorId: string;
}

// ------------------------
// Component Props Interfaces
// ------------------------

export interface AbsentProps {
    onClose: () => void;
    onSubmit: (data: AbsentFormData) => Promise<void>;
    productionLineId: string;
    supervisorId: string;
}

// ------------------------
// Document Interfaces
// ------------------------

export interface AbsentRecord {
    id: string;
    employeeId: string;
    reason?: string;
    startDate: Date;
    endDate: Date;
    productionLineId: string;
    supervisorId: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}