// src/components/Admin/WorkDays.tsx

import React, { useState } from 'react';
import './WorkDays.css';

const defaultDays = [
    { name: 'Monday', selected: true },
    { name: 'Tuesday', selected: true },
    { name: 'Wednesday', selected: true },
    { name: 'Thursday', selected: true },
    { name: 'Friday', selected: true },
    { name: 'Saturday', selected: false },
    { name: 'Sunday', selected: false },
];

interface PublicHoliday {
    id: number;
    date: string; // In format 'YYYY-MM-DD'
    description: string;
}

const WorkDays: React.FC = () => {
    const [workDays, setWorkDays] = useState(defaultDays);
    const [publicHolidays, setPublicHolidays] = useState<PublicHoliday[]>([]);
    const [holidayDate, setHolidayDate] = useState<string>('');
    const [holidayDescription, setHolidayDescription] = useState<string>('');

    const toggleDaySelection = (index: number) => {
        const updatedDays = [...workDays];
        updatedDays[index].selected = !updatedDays[index].selected;
        setWorkDays(updatedDays);
    };

    const addPublicHoliday = () => {
        if (!holidayDate || !holidayDescription) {
            alert('Please provide both a date and a description for the holiday.');
            return;
        }

        const newHoliday: PublicHoliday = {
            id: publicHolidays.length + 1,
            date: holidayDate,
            description: holidayDescription,
        };

        setPublicHolidays([...publicHolidays, newHoliday]);
        setHolidayDate('');
        setHolidayDescription('');
    };

    const removePublicHoliday = (id: number) => {
        setPublicHolidays(publicHolidays.filter((holiday) => holiday.id !== id));
    };

    const handleSaveWorkDays = () => {
        alert('Workdays and holidays have been saved.');
    };

    return (
        <div className="workdays-container">
            <div className="workdays-card">
                <div className="card-header">
                    <button className="back-button" onClick={() => window.history.back()}>
                        Back to Admin
                    </button>
                    <h1>Work Days</h1>
                </div>
                <div className="card-content">
                    <h2>Select Workdays</h2>
                    <div className="days-list">
                        {workDays.map((day, index) => (
                            <label key={day.name} className="day-option">
                                <input
                                    type="checkbox"
                                    checked={day.selected}
                                    onChange={() => toggleDaySelection(index)}
                                />
                                {day.name}
                            </label>
                        ))}
                    </div>

                    <h2>Public Holidays</h2>
                    <div className="holiday-input">
                        <input
                            type="date"
                            value={holidayDate}
                            onChange={(e) => setHolidayDate(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Holiday description"
                            value={holidayDescription}
                            onChange={(e) => setHolidayDescription(e.target.value)}
                        />
                        <button className="add-button" onClick={addPublicHoliday}>
                            Add Holiday
                        </button>
                    </div>

                    <ul className="holiday-list">
                        {publicHolidays.map((holiday) => (
                            <li key={holiday.id}>
                                {holiday.date} - {holiday.description}
                                <button
                                    className="remove-button"
                                    onClick={() => removePublicHoliday(holiday.id)}
                                >
                                    Remove
                                </button>
                            </li>
                        ))}
                    </ul>

                    <button className="save-button" onClick={handleSaveWorkDays}>
                        Save Workdays
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WorkDays;