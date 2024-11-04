// src/types.ts

import { Timestamp } from 'firebase/firestore';

// ------------------------
// Entity Interfaces
// ------------------------

export interface ProductionLine {
    id: string;
    name: string;
    description?: string;
    active: boolean;
    currentStyle?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    assignedTimeTable: string;

}

export interface Style {
    id: string;
    styleNumber: string;
    styleName: string;
    description: string;
    unitsInOrder: number;
    deliveryDate: string;
    hourlyTarget: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    unitsProduced: number;
    customer: string;     // New field for customer
    smv: number;
    status: string;
}

export interface SupportFunction {
    id: string;
    name: string;
    surname: string;
    employeeNumber: string;
    role: 'Supervisor' | 'Mechanic' | 'QC' | 'Operator';
    hasPassword: boolean;
    password: string; // Security Note: Use Firebase Auth for passwords
    active: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface TimeSlot {
    id: string;
    startTime: string; // Format 'HH:mm'
    endTime: string;   // Format 'HH:mm'
    breakId: string | null;
}

export interface Break {
    id: string;
    breakType: 'Lunch' | 'Tea';
    startTime: string; // Format 'HH:mm'
    endTime: string;   // Format 'HH:mm'
    duration: number;  // Duration in minutes
}

export interface TimeTable {
    id: string;
    name: string;
    lineId: string;
    slots: TimeSlot[];
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface Employee {
    id: string;
    employeeNumber: string;
    name: string;
    surname: string;
    role: string;
    active: boolean;
}

export interface SessionData {
    sessionId: string;
    lineId: string;
    supervisorId: string;
    startTime: Timestamp;
    endTime?: Timestamp;
    isActive: boolean;
    styleId: string ;
    target: number;
    timeTableId: string;


}

export interface ScheduledStyle {
    id: string;
    styleName: string;
    styleNumber: string;
    lineId: string;
    onLineDate: string;
    offLineDate: string; // New field for offline date
    expectedDeliveryDate: string; // New field for expected delivery date
    deliveryDate: string;
    status: string;
}
// ------------------------
// Helper Functions
// ------------------------

export const convertTimestampToDate = (timestamp: Timestamp): Date => {
    return timestamp.toDate();
};