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
    status: string; // Open or Closed
    mechanicAcknowledged?: boolean; // New field to track mechanic acknowledgment
    startTime: Timestamp;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    mechanicAcknowledgedAt?: Timestamp; // Added this field to track when the mechanic acknowledged it
    resolvedAt?: Timestamp;
    mechanicName?: string; // Added this field for mechanic's name display
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
