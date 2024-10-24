// src/interfaces/DowntimeItem.ts

export interface DowntimeCard {
    docId: string;
    productionLineId: string;
    supervisorId: string;
    mechanicId?: string;
    startTime: Date;
    mechanicReceivedTime?: Date;
    endTime?: Date;
    category: string;
    reason: string;
    status: 'Open' | 'Mechanic Received' | 'Resolved' | 'Style Change In Progress' | 'Style Change Completed';
    createdAt: Date;
    updatedAt: Date;
    comments?: string;
    failureReason?: string;
}