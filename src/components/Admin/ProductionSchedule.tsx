// src/components/Admin/ProductionSchedule.tsx

import React, { useState, useEffect } from 'react';
import './ProductionSchedule.css';

interface Style {
    id: number;
    styleName: string;
    styleNumber: string;
    startDate: string;
    deliveryDate: string;
}

interface ProductionLine {
    id: number;
    lineName: string;
    styles: Style[];
}

const ProductionSchedule: React.FC = () => {
    const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
    const [selectedLine, setSelectedLine] = useState<number | null>(null);
    const [styleName, setStyleName] = useState<string>('');
    const [styleNumber, setStyleNumber] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [deliveryDate, setDeliveryDate] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [editStyle, setEditStyle] = useState<Style | null>(null);

    useEffect(() => {
        const mockLines = [
            { id: 1, lineName: 'Line A', styles: [] },
            { id: 2, lineName: 'Line B', styles: [] },
        ];
        setProductionLines(mockLines);
    }, []);

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedLine(null);
        setStyleName('');
        setStyleNumber('');
        setStartDate('');
        setDeliveryDate('');
        setEditStyle(null);
    };

    const handleAddOrEditStyle = () => {
        if (!selectedLine || !styleName || !styleNumber || !startDate || !deliveryDate) {
            alert('Please fill in all fields.');
            return;
        }

        const newStyle: Style = {
            id: editStyle ? editStyle.id : Date.now(),
            styleName,
            styleNumber,
            startDate,
            deliveryDate,
        };

        setProductionLines((prevLines) =>
            prevLines.map((line) =>
                line.id === selectedLine
                    ? {
                        ...line,
                        styles: editStyle
                            ? line.styles.map((style) =>
                                style.id === editStyle.id ? newStyle : style
                            )
                            : [...line.styles, newStyle].sort(
                                (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
                            ),
                    }
                    : line
            )
        );

        closeModal();
    };

    const handleRemoveStyle = (lineId: number, styleId: number) => {
        setProductionLines((prevLines) =>
            prevLines.map((line) =>
                line.id === lineId
                    ? { ...line, styles: line.styles.filter((style) => style.id !== styleId) }
                    : line
            )
        );
    };

    const handleEditStyle = (lineId: number, style: Style) => {
        setSelectedLine(lineId);
        setStyleName(style.styleName);
        setStyleNumber(style.styleNumber);
        setStartDate(style.startDate);
        setDeliveryDate(style.deliveryDate);
        setEditStyle(style);
        openModal();
    };

    return (
        <div className="production-schedule-container">
            <div className="production-schedule-card">
                <div className="card-header">
                    <button className="back-button" onClick={() => window.history.back()}>
                        Back to Admin
                    </button>
                    <h1 className="title">Production Schedule</h1>
                    <button className="schedule-button" onClick={openModal}>
                        Schedule Line
                    </button>
                </div>
                <div className="card-content">
                    {productionLines.length > 0 ? (
                        <div className="schedule-view">
                            {productionLines.map((line) => (
                                <div key={line.id} className="line-row">
                                    <div className="line-name">{line.lineName}</div>
                                    <div className="style-blocks">
                                        {line.styles.length > 0 ? (
                                            line.styles.map((style) => (
                                                <div
                                                    key={style.id}
                                                    className="style-block"
                                                    onClick={() => handleEditStyle(line.id, style)}
                                                >
                                                    <span>{style.styleNumber}</span>
                                                    <button
                                                        className="remove-style-button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveStyle(line.id, style.id);
                                                        }}
                                                    >
                                                        X
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <span className="no-styles">No styles scheduled.</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p>No production lines available. Please add lines in the Admin Dashboard.</p>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>{editStyle ? 'Edit Style' : 'Schedule a Style'}</h2>
                        <label>
                            Select Line:
                            <select value={selectedLine || ''} onChange={(e) => setSelectedLine(Number(e.target.value))}>
                                <option value="">Select a line</option>
                                {productionLines.map((line) => (
                                    <option key={line.id} value={line.id}>
                                        {line.lineName}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Style Name:
                            <input type="text" value={styleName} onChange={(e) => setStyleName(e.target.value)} />
                        </label>
                        <label>
                            Style Number:
                            <input type="text" value={styleNumber} onChange={(e) => setStyleNumber(e.target.value)} />
                        </label>
                        <label>
                            Planned Start Date:
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        </label>
                        <label>
                            Delivery Date:
                            <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
                        </label>
                        <div className="modal-buttons">
                            <button onClick={handleAddOrEditStyle}>
                                {editStyle ? 'Save Changes' : 'Save Schedule'}
                            </button>
                            <button onClick={closeModal}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductionSchedule;