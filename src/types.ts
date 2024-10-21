// src/types.ts

import { Timestamp } from 'firebase/firestore';

export interface BasicInfo {
    lineName: string;
    productName: string;
    productReference: string;
    productDescription: string;
    unitsInOrder: number;
    deliveryDate: string;
    costOfProduct: number;
    hourlyTarget: number;
    breakevenTarget: number;
}

export interface BreakTime {
    type: 'Lunch' | 'Tea';
    duration: number; // in minutes
}

export interface TimeSlot {
    id: number;
    startTime: string; // "08:00"
    endTime: string;   // "09:00"
    break?: BreakTime; // Optional break associated with this slot
}

export interface TimeTable {
    name: string;
    days: string[];
    timeSlots: TimeSlot[];
}

export interface ProductionTarget {
    workDays: string[];
    timeTables: TimeTable[];
}

export interface Measurement {
    hour: string;
    target: number;
    output: number;
    hourlyEfficiency: number;
    cumulativeEfficiency: number;
}

export interface ActiveDowntime {
    id: number;
    reason: string;
    startTime: Date;
}

export interface DowntimeLog {
    id: number;
    reason: string;
    timeLost: string;
}

// **Add the Downtime Interface Below**
export interface Downtime {
    id: string;
    category: string;
    machine: string;
    createdAt: Timestamp;
    productionLineId: string;
    reason: string;
    startTime: Timestamp;
    status: 'Open' | 'Resolved';
    supervisorId: string;
    updatedAt: Timestamp;
}