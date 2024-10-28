// src/types/downtime/MachineType.ts

import { Timestamp } from 'firebase/firestore';
import { SupportFunction } from '../../../../types'; // Import from src/types.ts

// ------------------------
// Form Data Interfaces
// ------------------------

export interface MachineFormData {
    reason: string;
    machineNumber: string;
    comments: string;
    supervisorId: string;
    mechanicId?: string;
    productionLineId?: string;
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

// ------------------------
// Document Interfaces
// ------------------------

export interface MachineRecord {
    id: string;
    reason: string;
    machineNumber: string;
    comments: string;
    supervisorId: string;
    mechanicId?: string;
    productionLineId?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// ------------------------
// Base Interfaces
// ------------------------

export interface MachineBase {
    id: string;
    reason: string;
    machineNumber: string;
    comments: string;
    supervisorId: string;
    mechanicId?: string;
    productionLineId?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
