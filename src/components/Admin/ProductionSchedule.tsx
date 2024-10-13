import React, { useState, useEffect } from 'react';
import './ProductionSchedule.css';

interface ProductionLine {
    id: number;
    lineName: string;
}

interface ScheduledStyle {
    id: number;
    lineId: number;
    styleName: string;
    styleNumber: string;
    plannedStartDate: string;
    deliveryDate: string;
}

const ProductionSchedule: React.FC = () => {
    const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
    const [scheduledStyles, setScheduledStyles] = useState<ScheduledStyle[]>([]);
    const [selectedLine, setSelectedLine] = useState<number | null>(null);
    const [styleName, setStyleName] = useState<string>('');
    const [styleNumber, setStyleNumber] = useState<string>('');
    const [plannedStartDate, setPlannedStartDate] = useState<string>('');
    const [deliveryDate, setDeliveryDate] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [selectedStyle, setSelectedStyle] = useState<ScheduledStyle | null>(null);

    // Load production lines from localStorage
    useEffect(() => {
        const savedLines = localStorage.getItem('productionLines');
        if (savedLines) {
            setProductionLines(JSON.parse(savedLines));
        }
    }, []);

    // Load scheduled styles from localStorage
    useEffect(() => {
        const savedSchedules = localStorage.getItem('scheduledStyles');
        if (savedSchedules) {
            setScheduledStyles(JSON.parse(savedSchedules));
        }
    }, []);

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => {
        setIsModalOpen(false);
        resetForm();
    };

    const handleAddSchedule = () => {
        if (!selectedLine || !styleName || !styleNumber || !plannedStartDate || !deliveryDate) {
            alert('Please fill out all fields.');
            return;
        }

        const newSchedule: ScheduledStyle = {
            id: scheduledStyles.length + 1,
            lineId: selectedLine,
            styleName,
            styleNumber,
            plannedStartDate,
            deliveryDate,
        };

        const updatedSchedules = [...scheduledStyles, newSchedule];
        setScheduledStyles(updatedSchedules);
        localStorage.setItem('scheduledStyles', JSON.stringify(updatedSchedules));
        closeModal();
    };

    const handleEditStyle = (schedule: ScheduledStyle) => {
        setSelectedStyle(schedule);
        setStyleName(schedule.styleName);
        setStyleNumber(schedule.styleNumber);
        setPlannedStartDate(schedule.plannedStartDate);
        setDeliveryDate(schedule.deliveryDate);
        setIsModalOpen(true);
    };

    const handleDeleteStyle = (id: number) => {
        const updatedSchedules = scheduledStyles.filter((schedule) => schedule.id !== id);
        setScheduledStyles(updatedSchedules);
        localStorage.setItem('scheduledStyles', JSON.stringify(updatedSchedules));
    };

    const resetForm = () => {
        setSelectedLine(null);
        setStyleName('');
        setStyleNumber('');
        setPlannedStartDate('');
        setDeliveryDate('');
        setSelectedStyle(null);
    };

    return (
        <div className="production-schedule-container">
            <div className="production-schedule-card">
                <div className="card-header">
                    <h1>Production Schedule</h1>
                    <button className="back-button" onClick={() => window.history.back()}>
                        Back to Admin
                    </button>
                </div>

                <div className="card-content">
                    <button className="schedule-line-button" onClick={openModal}>
                        Schedule Line
                    </button>

                    <div className="gantt-chart">
                        {productionLines.map((line) => (
                            <div key={line.id} className="gantt-row">
                                <div className="gantt-line-name">{line.lineName}</div>
                                <div className="gantt-line-styles">
                                    {scheduledStyles
                                        .filter((style) => style.lineId === line.id)
                                        .map((style) => (
                                            <div
                                                key={style.id}
                                                className="gantt-style-block"
                                                onClick={() => handleEditStyle(style)}
                                            >
                                                {style.styleNumber}
                                            </div>
                                        ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>{selectedStyle ? 'Edit Style' : 'Schedule Line'}</h2>
                        <label>
                            Select Line:
                            <select
                                value={selectedLine || ''}
                                onChange={(e) => setSelectedLine(Number(e.target.value))}
                                disabled={!!selectedStyle}
                            >
                                <option value="">Select a line</option>
                                {productionLines.length > 0 ? (
                                    productionLines.map((line) => (
                                        <option key={line.id} value={line.id}>
                                            {line.lineName}
                                        </option>
                                    ))
                                ) : (
                                    <option value="">No lines available</option>
                                )}
                            </select>
                        </label>

                        <label>
                            Style Name:
                            <input
                                type="text"
                                value={styleName}
                                onChange={(e) => setStyleName(e.target.value)}
                            />
                        </label>

                        <label>
                            Style Number:
                            <input
                                type="text"
                                value={styleNumber}
                                onChange={(e) => setStyleNumber(e.target.value)}
                            />
                        </label>

                        <label>
                            Planned Start Date:
                            <input
                                type="date"
                                value={plannedStartDate}
                                onChange={(e) => setPlannedStartDate(e.target.value)}
                            />
                        </label>

                        <label>
                            Delivery Date:
                            <input
                                type="date"
                                value={deliveryDate}
                                onChange={(e) => setDeliveryDate(e.target.value)}
                            />
                        </label>

                        <div className="modal-buttons">
                            <button onClick={handleAddSchedule}>
                                {selectedStyle ? 'Save Changes' : 'Schedule Line'}
                            </button>
                            <button onClick={closeModal}>Cancel</button>
                            {selectedStyle && (
                                <button onClick={() => handleDeleteStyle(selectedStyle.id)}>
                                    Delete
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductionSchedule;