import { Timestamp } from 'firebase/firestore';

// ------------------------
// Form Data Interfaces
// ------------------------

export interface StyleChangeoverFormData {
    currentStyle: string;
    nextStyle: string;
    target: string;
    productionLineId: string;
    supervisorId: string;
}

// ------------------------
// Component Props Interfaces
// ------------------------

export interface StyleChangeProps {
    onClose: () => void;
    onSubmit: (formData: StyleChangeoverFormData) => Promise<void>;
    productionLineId: string;
    supervisorId: string;
}

// ------------------------
// Document Interfaces
// ------------------------

export interface StyleChangeoverRecord {
    id: string;
    currentStyle: string;
    nextStyle: string;
    target: string;
    productionLineId: string;
    supervisorId: string;
    password: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    progressSteps: {
        machineSetupComplete: boolean;
        peopleAllocated: boolean;
        firstUnitOffLine: boolean;
        qcApproved: boolean;
    };
    completedBy?: {
        [key in keyof StyleChangeoverRecord['progressSteps']]?: {
            userId: string;
            timestamp: Timestamp;
        };
    };
}

// ------------------------
// Base Interfaces
// ------------------------

export interface StyleChangeoverBase {
    id: string;
    currentStyle: string;
    nextStyle: string;
    target: string;
    productionLineId: string;
    supervisorId: string;
    password: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
