import { Timestamp } from 'firebase/firestore';

// ------------------------
// Form Data Interfaces
// ------------------------

export interface AbsentFormData {
    employeeId: string;
    reason?: string; // Optional reason field
    startDate: Date; // Start date is automatically set as new Date()
    endDate: Date; // End date is automatically set as new Date()
    productionLineId: string;
    supervisorId: string; // This should hold the selected supervisor's employeeNumber
    type: 'absent',
    status: 'open'
}

// ------------------------
// Component Props Interfaces
// ------------------------

export interface AbsentProps {
    onClose: () => void;
    onSubmit: (data: AbsentFormData) => Promise<void>;
    productionLineId: string;

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

// AbsentUpdate props
interface AbsentUpdateProps {
    onClose: () => void;
    lineId: string;
    supervisorId: string;
    onSubmit: () => Promise<void>;
}
