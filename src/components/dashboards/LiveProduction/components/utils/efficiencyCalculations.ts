// Use existing SessionData type
export interface SessionData {
    units: number;
    target: number;
}

// Helper function to safely check if two dates are the same day
export const isSameDay = (date1: Date | undefined | null, date2: Date | undefined | null): boolean => {
    if (!date1 || !date2) {
        console.error('Dates are missing for comparison');
        return false;
    }

    const d1 = new Date(date1);
    const d2 = new Date(date2);

    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
        console.error('Invalid date provided for comparison');
        return false;
    }

    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
};

// Helper function to calculate real-time efficiency without relying on session start time
export const calculateTimeBasedEfficiency = (
    unitProduced: number,
    targetPerHour: number,
    slotStartTime: Date | undefined | null,
    currentTime: Date = new Date()
): number => {
    if (!slotStartTime || !currentTime) {
        console.error('Missing slot start time or current time');
        return 0;
    }

    try {
        // Calculate minutes elapsed since the start of the current slot
        const minutesElapsed = (currentTime.getTime() - slotStartTime.getTime()) / (1000 * 60);

        if (minutesElapsed < 0) {
            console.error('Current time is before the slot start time');
            return 0;
        }

        // Calculate expected units based on elapsed minutes
        const targetPerMinute = targetPerHour / 60;
        const expectedUnits = targetPerMinute * minutesElapsed;

        // Calculate efficiency
        const efficiency = expectedUnits > 0 ? (unitProduced / expectedUnits) * 100 : 0;

        return Math.min(Math.max(efficiency, 0), 100);
    } catch {
        return 0;
    }
};