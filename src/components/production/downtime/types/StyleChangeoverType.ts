// src/types/downtime/StyleChangeoverType.ts

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
