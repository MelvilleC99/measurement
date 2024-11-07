// src/components/ProductionSchedule.tsx

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
import { ScheduledStyle, Style, ProductionLine } from '../../types';

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

    // Fetch production lines and styles from Firestore
    useEffect(() => {
        fetchProductionLines();
        fetchScheduledStyles();
        fetchStyles();
    }, []);

    const fetchProductionLines = async () => {
        try {
            const linesSnapshot = await getDocs(collection(db, 'productionLines'));
            // @ts-ignore
            const linesList: ProductionLine[] = linesSnapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name,
                    description: data.description,
                    active: data.active || false,
                    currentStyle: data.currentStyle,
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                    assignedTimeTable: data.assignedTimeTable || '',
                };
            });
            setProductionLines(linesList);
        } catch (error) {
            console.error('Error fetching production lines:', error);
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
                    offLineDate: data.offLineDate,
                    expectedDeliveryDate: data.expectedDeliveryDate,
                    deliveryDate: data.deliveryDate,
                    status: data.status,
                };
            });
            setScheduledStyles(stylesList);
        } catch (error) {
            console.error('Error fetching scheduled styles:', error);
        }
    };

    const fetchStyles = async () => {
        try {
            const stylesSnapshot = await getDocs(collection(db, 'styles'));
            const stylesList: Style[] = stylesSnapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    styleName: data.styleName,
                    styleNumber: data.styleNumber,
                    description: data.description,
                    unitsInOrder: data.unitsInOrder,
                    deliveryDate: data.deliveryDate,
                    hourlyTarget: data.hourlyTarget || 0,
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                    unitsProduced: data.unitsProduced || 0,
                    customer: data.customer || '',
                    smv: data.smv || 0,
                    status: data.status,
                };
            });
            setStyles(stylesList);
        } catch (error) {
            console.error('Error fetching styles:', error);
        }
    };

    // Open modal to schedule a style
    const openModal = () => {
        setShowStyleSelector(true);
        setIsModalOpen(true);
    };

    // Save the scheduled style to Firestore
    const handleSaveStyleToLine = async () => {
        if (
            !selectedLine ||
            !onLineDate ||
            !offLineDate ||
            !expectedDeliveryDate ||
            !selectedStyle
        ) {
            alert('Please fill out all fields.');
            return;
        }

        const updatedFields: Omit<ScheduledStyle, 'id'> = {
            styleName: selectedStyle.styleName,
            styleNumber: selectedStyle.styleNumber,
            lineId: selectedLine,
            onLineDate: onLineDate,
            offLineDate: offLineDate,
            expectedDeliveryDate: expectedDeliveryDate,
            deliveryDate: selectedStyle.deliveryDate,
            status: 'scheduled',
        };

        try {
            if (selectedStyle.status === 'unscheduled') {
                // Add new scheduled style
                await addDoc(collection(db, 'scheduledStyles'), updatedFields);
            } else {
                // Update existing scheduled style
                await updateDoc(doc(db, 'scheduledStyles', selectedStyle.id), updatedFields);
            }
            fetchScheduledStyles();
            closeModal();
        } catch (error) {
            console.error('Error updating the scheduled style:', error);
            alert('An error occurred while updating the scheduled style.');
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedStyle(null);
        setSelectedLine(null);
        setOnLineDate('');
        setOffLineDate('');
        setExpectedDeliveryDate('');
    };

    // Handle clicking on an existing scheduled style for editing
    const handleEditStyle = (style: ScheduledStyle) => {
        setSelectedStyle(style);
        setSelectedLine(style.lineId);
        setOnLineDate(style.onLineDate);
        setOffLineDate(style.offLineDate);
        setExpectedDeliveryDate(style.expectedDeliveryDate);
        setShowStyleSelector(false); // Now switching to "edit" mode
        setIsModalOpen(true);
    };

    // Handle selecting a new style to schedule
    const handleSelectStyle = (styleId: string) => {
        const selected = styles.find((style) => style.id === styleId);
        if (selected) {
            const newScheduledStyle: ScheduledStyle = {
                id: '', // Will be set by Firestore when adding a new document
                styleName: selected.styleName,
                styleNumber: selected.styleNumber,
                lineId: '',
                onLineDate: '',
                offLineDate: '',
                expectedDeliveryDate: '',
                deliveryDate: selected.deliveryDate,
                status: 'unscheduled',
            };
            setSelectedStyle(newScheduledStyle);
            setShowStyleSelector(false);
        }
    };

    // Handle deleting a scheduled style
    const handleDeleteStyle = async (styleId: string) => {
        try {
            await deleteDoc(doc(db, 'scheduledStyles', styleId));
            fetchScheduledStyles(); // Refresh after delete
            closeModal();
        } catch (error) {
            console.error('Error deleting scheduled style:', error);
            alert('An error occurred while deleting the scheduled style.');
        }
    };

    return (
        <div className="production-schedule-container">
            <div className="toolbar">
                <button onClick={openModal}>Schedule Style</button>
            </div>
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
                                            {style.styleNumber}
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
                        {showStyleSelector ? (
                            <>
                                <h2>Select Style to Schedule</h2>
                                <select
                                    onChange={(e) => handleSelectStyle(e.target.value)}
                                    defaultValue=""
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
                                <button onClick={closeModal}>Cancel</button>
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
                                    />

                                    <label>Off Line Date:</label>
                                    <input
                                        type="date"
                                        value={offLineDate}
                                        onChange={(e) => setOffLineDate(e.target.value)}
                                    />

                                    <label>Expected Delivery Date:</label>
                                    <input
                                        type="date"
                                        value={expectedDeliveryDate}
                                        onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                                    />
                                </div>

                                <div className="modal-buttons">
                                    <button onClick={handleSaveStyleToLine}>Save</button>
                                    {selectedStyle?.status === 'scheduled' && selectedStyle.id && (
                                        <button
                                            onClick={() => handleDeleteStyle(selectedStyle.id)}
                                        >
                                            Remove
                                        </button>
                                    )}
                                    <button onClick={closeModal}>Cancel</button>
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
