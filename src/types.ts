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

export interface SupportFunction {
    id: string;
    name: string;
    surname: string;
    employeeNumber: string;
    role: string;
    hasPassword: boolean;
    password: string;
}

export interface ReworkItem {
    docId: string;
    count: number;
    reason: string;
    operation: string;
    startTime: Date;
    endTime?: Date;
    status: 'Booked Out' | 'Booked In' | 'Rejected';
    productionLineId: string;
    supervisorId: string;
}

export interface Reject {
    docId: string;
    count: number;
    reason: string;
    recordedAsProduced: boolean;
    qcApprovedBy: string;
    productionLineId: string;
    supervisorId: string;
    timestamp: Date;
}

export interface StyleChangeoverStep {
    id: 'machineSetup' | 'peopleAllocated' | 'firstOffLine' | 'qcApproved';
    label: string;
    required: boolean;
    completedAt?: Date;
    completedBy?: string;
    comment?: string;
}

export interface StyleChangeoverState {
    currentStyle: string;
    nextStyle: string;
    steps: StyleChangeoverStep[];
    startTime: Date;
    status: 'InProgress' | 'Completed';
}

export interface SpecializedDowntimeState {
    type: 'machine' | 'style-changeover';
    category: string;
    startTime: Date;
}

export interface DowntimeSubmitData {
    category: string;
    reason: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface DowntimeCategory {
    categoryName: string;
    reasons: string[];
}