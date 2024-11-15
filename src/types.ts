// src/types.ts

import { Timestamp } from 'firebase/firestore';

// ------------------------
// Entity Interfaces
// ------------------------

export interface TimeTableAssignment {
    id: string; // Unique ID for the assignment
    timeTableId: string;
    timeTableName: string; // For easier display
    fromDate: string;
    toDate: string;

}

export interface ProductionLine {
    id: string;
    name: string;
    description?: string;
    active: boolean;
    currentStyle?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    timeTableAssignments: TimeTableAssignment[]; // Updated property
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
    customer: string; // New field for customer
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
    startTime: string;
    endTime: string;
    breakId?: string;
}

export interface Schedule {
    id: string;
    slots: TimeSlot[];
    daysOfWeek: string[]; // Days this schedule applies to
}

export interface TimeTable {
    id: string;
    name: string;
    description: string;
    isOvertime: boolean;
    schedules: Schedule[];
    createdAt : Timestamp; // Made optional
}

export interface Break {
    id: string;
    name: string;
    description: string;
    duration: number; // Break duration in minutes
}

export interface OvertimeSchedule {
    id: string;
    timeTableId: string;
    productionLineIds: string[];
    startDate: string; // 'YYYY-MM-DD'
    endDate: string;   // 'YYYY-MM-DD'
    isOvertime: boolean;
    createdAt : Timestamp; // Made optional
    name: string;
    description: string;
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
    styleId: string;
    target: number;
    timeTableId: string;
    isOvertime?: boolean;
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


// Define ActiveSession interface similar to SessionData
export interface ActiveSession {
    id: string;
    lineId: string;
    supervisorId: string;
    startTime: Timestamp;
    endTime?: Timestamp;
    isActive: boolean;
    styleId: string;
    target: number;
    timeTableId: string;
    isOvertime?: boolean;
    unitsProduced: number; // Added property

}

// SubAssembly Interface
// ------------------------


    export interface SubAssembly {
        id: string;
        name: string;
        description?: string;
        createdAt: Timestamp;
        updatedAt: Timestamp;
    }

    export interface Process {
        id: string;
        name: string;
        description?: string;
        sequence: number; // Order in the production workflow
        createdAt: Timestamp;
        updatedAt: Timestamp;
        subAssemblyIds: string[]; // Linked SubAssemblies}

    }

// Measure points

export interface MeasurementPoint {
    id: string;
    name: string;
    description?: string;
    type: 'Bottleneck' | 'Input' | 'QualityControl' | 'Other';
    createdAt: Timestamp;
    updatedAt: Timestamp;
    processId: string; // Linked Process
    productionLineId: string; // Linked Production Line
}


// ------------------------
// Helper Functions
// ------------------------

export const convertTimestampToDate = (timestamp: Timestamp): Date => {
    return timestamp.toDate();
};
