import React, { useState, useEffect } from 'react';
import './ProductionSchedule.css';
import { db } from '../../firebase';
import {
    collection,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    addDoc,
} from 'firebase/firestore';
import {
    ScheduledStyle,
    Style,
    ProductionLine,
} from '../../types';

const ProductionSchedule: React.FC = () => {
    const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
    const [scheduledStyles, setScheduledStyles] = useState<ScheduledStyle[]>([]);
    const [styles, setStyles] = useState<Style[]>([]);
    const [selectedStyle, setSelectedStyle] = useState<ScheduledStyle | null>(null);
    const [onLineDate, setOnLineDate] = useState<string>('');
    const [offLineDate, setOffLineDate] = useState<string>('');
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>('');
    const [selectedLine, setSelectedLine] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showStyleSelector, setShowStyleSelector] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await Promise.all([
                fetchProductionLines(),
                fetchScheduledStyles(),
                fetchStyles()
            ]);
        } catch (error) {
            console.error('Error fetching initial data:', error);
            setError('Failed to load initial data. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchProductionLines = async () => {
        try {
            const linesSnapshot = await getDocs(collection(db, 'productionLines'));
            const linesList: ProductionLine[] = linesSnapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name,
                    description: data.description || '',
                    active: data.active || false,
                    currentStyle: data.currentStyle,
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                    timeTableAssignments: (data.timeTableAssignments || []).map((assignment: any) => ({
                        id: assignment.id,
                        timeTableId: assignment.timeTableId,
                        timeTableName: assignment.timeTableName,
                        fromDate: assignment.fromDate,
                        toDate: assignment.toDate
                    }))
                };
            });
            setProductionLines(linesList);
        } catch (error) {
            console.error('Error fetching production lines:', error);
            throw error;
        }
    };

    const fetchScheduledStyles = async () => {
        try {
            const stylesSnapshot = await getDocs(collection(db, 'scheduledStyles'));
            const stylesList: ScheduledStyle[] = stylesSnapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    styleName: data.styleName,
                    styleNumber: data.styleNumber,
                    lineId: data.lineId,
                    onLineDate: data.onLineDate,
                    offLineDate: data.offLineDate || '',
                    expectedDeliveryDate: data.expectedDeliveryDate || '',
                    deliveryDate: data.deliveryDate,
                    status: data.status,
                };
            });
            setScheduledStyles(stylesList);
        } catch (error) {
            console.error('Error fetching scheduled styles:', error);
            throw error;
        }
    };

    const fetchStyles = async () => {
        try {
            const stylesSnapshot = await getDocs(collection(db, 'styles'));
            const stylesList: Style[] = stylesSnapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    styleNumber: data.styleNumber,
                    styleName: data.styleName,
                    description: data.description,
                    unitsInOrder: data.unitsInOrder,
                    deliveryDate: data.deliveryDate,
                    hourlyTarget: data.hourlyTarget,
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                    unitsProduced: data.unitsProduced || 0,
                    customer: data.customer || '',
                    smv: data.smv || 0,
                    status: data.status
                };
            });
            setStyles(stylesList);
        } catch (error) {
            console.error('Error fetching styles:', error);
            throw error;
        }
    };

    const openModal = () => {
        setShowStyleSelector(true);
        setIsModalOpen(true);
        setError(null);
    };

    const handleSelectStyle = (styleId: string) => {
        const selected = styles.find((style) => style.id === styleId);
        if (selected) {
            const newScheduledStyle: ScheduledStyle = {
                id: '',
                styleName: selected.styleName,
                styleNumber: selected.styleNumber,
                lineId: '',
                onLineDate: '',
                offLineDate: '',
                expectedDeliveryDate: '',
                deliveryDate: selected.deliveryDate,
                status: 'unscheduled'
            };
            setSelectedStyle(newScheduledStyle);
            setShowStyleSelector(false);
        }
    };

    const handleSaveStyleToLine = async () => {
        if (!selectedStyle || !selectedLine || !onLineDate) {
            alert('Please fill out all required fields.');
            return;
        }

        try {
            const scheduleData = {
                deliveryDate: selectedStyle.deliveryDate,
                lineId: selectedLine,
                onLineDate: onLineDate,
                status: "scheduled",
                styleName: selectedStyle.styleName,
                styleNumber: selectedStyle.styleNumber
            };

            if (!selectedStyle.id || selectedStyle.status === 'unscheduled') {
                await addDoc(collection(db, 'scheduledStyles'), scheduleData);
            } else {
                await updateDoc(doc(db, 'scheduledStyles', selectedStyle.id), scheduleData);
            }

            await fetchScheduledStyles();
            closeModal();
        } catch (error) {
            console.error('Error saving schedule:', error);
            alert('Error saving schedule: ' + (error as Error).message);
        }
    };

    const handleEditStyle = (style: ScheduledStyle) => {
        setSelectedStyle(style);
        setSelectedLine(style.lineId);
        setOnLineDate(style.onLineDate);
        setOffLineDate(style.offLineDate);
        setExpectedDeliveryDate(style.expectedDeliveryDate);
        setShowStyleSelector(false);
        setIsModalOpen(true);
        setError(null);
    };

    const handleDeleteStyle = async (styleId: string) => {
        if (!window.confirm('Are you sure you want to remove this scheduled style?')) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await deleteDoc(doc(db, 'scheduledStyles', styleId));
            await fetchScheduledStyles();
            closeModal();
        } catch (error) {
            console.error('Error deleting scheduled style:', error);
            setError('Failed to delete the scheduled style. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedStyle(null);
        setSelectedLine(null);
        setOnLineDate('');
        setOffLineDate('');
        setExpectedDeliveryDate('');
        setError(null);
    };

    if (isLoading && !isModalOpen) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <div className="production-schedule-container">
            <div className="toolbar">
                <button onClick={openModal} disabled={isLoading}>
                    Schedule Style
                </button>
            </div>

            {error && !isModalOpen && (
                <div className="error-message">{error}</div>
            )}

            <div className="schedule-list">
                <h2>Scheduled Styles</h2>
                {productionLines.length === 0 ? (
                    <p>No production lines available.</p>
                ) : (
                    productionLines.map((line) => (
                        <div key={line.id} className="schedule-line">
                            <div className="line-name">{line.name}</div>
                            <div className="line-scheduled-styles">
                                {scheduledStyles
                                    .filter((style) => style.lineId === line.id)
                                    .map((style) => (
                                        <div
                                            key={style.id}
                                            className="style-block"
                                            onClick={() => handleEditStyle(style)}
                                        >
                                            <span className="style-number">{style.styleNumber}</span>
                                            <span className="style-dates">
                                                {style.onLineDate}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        {error && (
                            <div className="error-message">{error}</div>
                        )}

                        {showStyleSelector ? (
                            <>
                                <h2>Select Style to Schedule</h2>
                                <select
                                    onChange={(e) => handleSelectStyle(e.target.value)}
                                    defaultValue=""
                                    disabled={isLoading}
                                >
                                    <option value="" disabled>
                                        Select a Style
                                    </option>
                                    {styles.map((style) => (
                                        <option key={style.id} value={style.id}>
                                            {style.styleName} - {style.styleNumber}
                                        </option>
                                    ))}
                                </select>
                                <button onClick={closeModal} disabled={isLoading}>
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <>
                                <h2>Style Card</h2>
                                <div className="input-container">
                                    <label>
                                        <strong>Style Name:</strong>
                                    </label>
                                    <p>{selectedStyle?.styleName}</p>

                                    <label>
                                        <strong>Style Number:</strong>
                                    </label>
                                    <p>{selectedStyle?.styleNumber}</p>

                                    <label>
                                        <strong>Delivery Date:</strong>
                                    </label>
                                    <p>{selectedStyle?.deliveryDate}</p>

                                    <label>Select Line:</label>
                                    <select
                                        value={selectedLine || ''}
                                        onChange={(e) => setSelectedLine(e.target.value)}
                                        disabled={isLoading}
                                    >
                                        <option value="">Select a Line</option>
                                        {productionLines.map((line) => (
                                            <option key={line.id} value={line.id}>
                                                {line.name}
                                            </option>
                                        ))}
                                    </select>

                                    <label>On Line Date:</label>
                                    <input
                                        type="date"
                                        value={onLineDate}
                                        onChange={(e) => setOnLineDate(e.target.value)}
                                        disabled={isLoading}
                                    />

                                    <div className="modal-buttons">
                                        <button
                                            onClick={handleSaveStyleToLine}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? 'Saving...' : 'Save'}
                                        </button>
                                        {selectedStyle?.status === 'scheduled' && selectedStyle.id && (
                                            <button
                                                onClick={() => handleDeleteStyle(selectedStyle.id)}
                                                disabled={isLoading}
                                            >
                                                {isLoading ? 'Removing...' : 'Remove'}
                                            </button>
                                        )}
                                        <button
                                            onClick={closeModal}
                                            disabled={isLoading}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductionSchedule;