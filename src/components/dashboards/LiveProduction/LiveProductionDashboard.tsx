// src/components/dashboards/LiveProduction/LiveProductionDashboard.tsx

import React, { useState, useEffect } from 'react';
import { useProductionData } from './dataFetching/useProductionData';

interface ProductionData {
    id: string;
    name: string;
    currentEfficiency: number;
    cumulativeEfficiency: number;
    hasActiveDowntime: boolean;
    downtimeType?: string;
    downtimeStartTime?: Date;
    unitsProduced: number;
    target: number;
}

const TIME_SLOTS = [
    { id: '1730803219273', label: '08:00 - 09:00', startTime: '08:00', endTime: '09:00' },
    { id: '1730803230697', label: '09:00 - 10:00', startTime: '09:00', endTime: '10:00' },
    { id: '1730803238259', label: '10:00 - 11:00 (Tea Break)', startTime: '10:00', endTime: '11:00' },
    { id: '1730803248241', label: '12:00 - 13:00', startTime: '12:00', endTime: '13:00' },
    { id: '1730803261548', label: '13:00 - 14:00', startTime: '13:00', endTime: '14:00' },
    { id: '1730803273225', label: '14:00 - 15:00 (Lunch)', startTime: '14:00', endTime: '15:00' },
    { id: '1730803280140', label: '15:00 - 16:00', startTime: '15:00', endTime: '16:00' },
    { id: '1730803288543', label: '16:00 - 17:00', startTime: '16:00', endTime: '17:00' }
];

// Helper function to determine the active slot based on current time
const getActiveSlotId = (
    currentTime: Date,
    slots: { id: string; label: string; startTime: string; endTime: string }[]
): string | null => {
    for (const slot of slots) {
        const [startHour, startMinute] = slot.startTime.split(':').map(Number);
        const [endHour, endMinute] = slot.endTime.split(':').map(Number);

        const slotStart = new Date(currentTime);
        slotStart.setHours(startHour, startMinute, 0, 0);

        const slotEnd = new Date(currentTime);
        slotEnd.setHours(endHour, endMinute, 0, 0);

        if (currentTime >= slotStart && currentTime < slotEnd) {
            return slot.id;
        }
    }

    return null; // No active slot found
};

const LiveProductionDashboard: React.FC = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [highlightMetric, setHighlightMetric] = useState<'current' | 'cumulative'>('current');
    const {productionData, loading, error} = useProductionData(
        selectedSlot || '',
        selectedDate,
        currentTime
    );

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);

            const activeSlotId = getActiveSlotId(now, TIME_SLOTS);
            if (activeSlotId && activeSlotId !== selectedSlot) {
                setSelectedSlot(activeSlotId);
            }
        }, 1000); // Update every second

        return () => clearInterval(timer);
    }, [selectedSlot]);

    const getEfficiencyColor = (efficiency: number): string => {
        if (efficiency >= 80) return 'bg-green-600 text-white';
        if (efficiency >= 60) return 'bg-yellow-500 text-black';
        return 'bg-red-600 text-white';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg">
                    <p className="font-bold">Error</p>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    // Removed the Time Slot Info section entirely

    // Helper function to format elapsed time
    const formatElapsedTime = (startTime: Date): string => {
        const elapsed = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-gray-100 text-gray-900">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <div>
                        <button
                            onClick={() => window.history.back()}
                            className="mb-4 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
                        >
                            ← Return
                        </button>
                        <h1 className="text-3xl font-bold text-gray-900">Production Dashboard</h1>
                        <p className="mt-1 text-sm text-gray-500">
                            {currentTime.toLocaleDateString('en-ZA', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>
                    </div>
                    <div className="text-4xl font-bold text-gray-800">
                        {currentTime.toLocaleTimeString('en-ZA', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                        })}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {/* Controls */}
                <div className="mb-4 flex flex-wrap gap-4 justify-end">
                    <div className="flex items-center">
                        <label className="mr-2 text-sm font-medium">Date:</label>
                        <input
                            type="date"
                            value={selectedDate.toISOString().split('T')[0]}
                            onChange={(e) => setSelectedDate(new Date(e.target.value))}
                            className="border rounded px-2 py-1 text-sm"
                        />
                    </div>
                    <div className="flex items-center">
                        <label className="mr-2 text-sm font-medium">Time Slot:</label>
                        <select
                            value={selectedSlot || ''}
                            onChange={(e) => setSelectedSlot(e.target.value)}
                            className="border rounded px-2 py-1 text-sm"
                        >
                            <option value="" disabled>
                                Select Slot
                            </option>
                            {TIME_SLOTS.map(slot => (
                                <option key={slot.id} value={slot.id}>
                                    {slot.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center">
                        <label className="mr-2 text-sm font-medium">Highlight:</label>
                        <select
                            value={highlightMetric}
                            onChange={(e) => setHighlightMetric(e.target.value as 'current' | 'cumulative')}
                            className="border rounded px-2 py-1 text-sm"
                        >
                            <option value="current">Current Efficiency</option>
                            <option value="cumulative">Cumulative Efficiency</option>
                        </select>
                    </div>
                </div>

                {/* Production Lines Grid */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {productionData.map((line: ProductionData) => (
                        <div key={line.id} className="bg-white overflow-hidden shadow rounded-lg flex flex-col">
                            {/* Header Banner */}
                            <div className="bg-gray-800 text-white py-2 px-4">
                                <h3 className="text-xl font-semibold text-center">{line.name}</h3>
                            </div>

                            {/* Efficiency Metrics */}
                            <div className="flex flex-1">
                                <div
                                    className={`flex-1 p-4 flex flex-col items-center justify-center ${
                                        highlightMetric === 'current'
                                            ? getEfficiencyColor(line.currentEfficiency)
                                            : 'bg-gray-100'
                                    }`}
                                >
                                    <span className="text-sm font-medium">Current</span>
                                    <span className="text-4xl font-bold">
                                        {line.currentEfficiency.toFixed(1)}%
                                    </span>
                                </div>
                                <div
                                    className={`flex-1 p-4 flex flex-col items-center justify-center ${
                                        highlightMetric === 'cumulative'
                                            ? getEfficiencyColor(line.cumulativeEfficiency)
                                            : 'bg-gray-100'
                                    }`}
                                >
                                    <span className="text-sm font-medium">Cumulative</span>
                                    <span className="text-4xl font-bold">
                                        {line.cumulativeEfficiency.toFixed(1)}%
                                    </span>
                                </div>
                            </div>

                            {/* Downtime Banner */}
                            {line.hasActiveDowntime && line.downtimeType && line.downtimeStartTime && (
                                <div className="bg-red-600 text-white py-2 px-4 mt-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold">{line.downtimeType}</span>
                                        <span className="text-sm">
                                            Active for: {formatElapsedTime(line.downtimeStartTime)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
    export default LiveProductionDashboard;
