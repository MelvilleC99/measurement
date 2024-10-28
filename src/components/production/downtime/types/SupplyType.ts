// src/components/production/downtime/types/SupplyType.ts

import { Timestamp } from 'firebase/firestore';

// ------------------------
// Form Data Interfaces
// ------------------------

export interface SupplyFormData {
    reason: string;
    comments: string;
    productionLineId: string;
    supervisorId: string;
    // Removed password as it's not needed for form submission
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

// ------------------------
// Document Interfaces
// ------------------------

export interface SupplyRecord {
    id: string;
    reason: string;
    comments: string;
    productionLineId: string;
    supervisorId: string;
    type: string;
    status: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    // Add other necessary fields if needed
}

// ------------------------
// Base Interfaces
// ------------------------

export interface SupplyBase {
    id: string;
    reason: string;
    comments: string;
    productionLineId: string;
    supervisorId: string;
    type: string;
    status: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}