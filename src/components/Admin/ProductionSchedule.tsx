import React, { useState, useEffect } from 'react';
import './ProductionSchedule.css';
import { db } from '../../firebase';
import { collection, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';

interface ProductionLine {
    id: string;
    name: string;
}

interface ScheduledStyle {
    id: string;
    styleName: string;
    styleNumber: string;
    lineId: string;
    onLineDate: string;
    deliveryDate: string;
    status: string;
}

interface StyleCard {
    id: string;
    styleName: string;
    styleNumber: string;
    description: string;
    productType: string;
    productCategory: string;
    unitsInOrder: number;
    cost: number;
    deliveryDate: string;
    status: string;
}

const ProductionSchedule: React.FC = () => {
    const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
    const [scheduledStyles, setScheduledStyles] = useState<ScheduledStyle[]>([]);
    const [styles, setStyles] = useState<StyleCard[]>([]);
    const [selectedStyle, setSelectedStyle] = useState<ScheduledStyle | null>(null);
    const [onLineDate, setOnLineDate] = useState<string>('');
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
            const linesList = linesSnapshot.docs.map((doc) => ({
                id: doc.id,
                name: doc.data().name,
            })) as ProductionLine[];
            setProductionLines(linesList);
        } catch (error) {
            console.error('Error fetching production lines:', error);
        }
    };

    const fetchScheduledStyles = async () => {
        try {
            const stylesSnapshot = await getDocs(collection(db, 'scheduledStyles'));
            const stylesList = stylesSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as ScheduledStyle[];
            setScheduledStyles(stylesList);
        } catch (error) {
            console.error('Error fetching scheduled styles:', error);
        }
    };

    const fetchStyles = async () => {
        try {
            const stylesSnapshot = await getDocs(collection(db, 'styles'));
            const stylesList = stylesSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as StyleCard[];
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
        if (!selectedLine || !onLineDate || !selectedStyle) {
            alert('Please fill out all fields.');
            return;
        }

        const updatedFields = {
            styleName: selectedStyle.styleName,
            styleNumber: selectedStyle.styleNumber,
            lineId: selectedLine,
            onLineDate: onLineDate,
            deliveryDate: selectedStyle.deliveryDate,
            status: 'scheduled',
        };

        try {
            await updateDoc(doc(db, 'scheduledStyles', selectedStyle.id), updatedFields);
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
    };

    // Handle clicking on an existing scheduled style for editing
    const handleEditStyle = (style: ScheduledStyle) => {
        setSelectedStyle(style);
        setSelectedLine(style.lineId);
        setOnLineDate(style.onLineDate);
        setShowStyleSelector(false); // Now switching to "edit" mode
        openModal();
    };

    // Handle selecting a new style to schedule
    const handleSelectStyle = (styleId: string) => {
        const selected = styles.find((style) => style.id === styleId);
        if (selected) {
            const newScheduledStyle: ScheduledStyle = {
                id: selected.id,
                styleName: selected.styleName,
                styleNumber: selected.styleNumber,
                lineId: '',
                onLineDate: '',
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
                            <div className="line-name">{line.name}</div> {/* Correct line name field */}
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
                                    <option value="" disabled>Select a Style</option>
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
                                    <label><strong>Style Name:</strong></label>
                                    <p>{selectedStyle?.styleName}</p>

                                    <label><strong>Style Number:</strong></label>
                                    <p>{selectedStyle?.styleNumber}</p>

                                    <label><strong>Delivery Date:</strong></label>
                                    <p>{selectedStyle?.deliveryDate}</p>

                                    <label>Select Line:</label>
                                    <select
                                        value={selectedLine || ''}
                                        onChange={(e) => setSelectedLine(e.target.value)}
                                    >
                                        <option value="">Select a Line</option>
                                        {productionLines.map((line) => (
                                            <option key={line.id} value={line.id}>
                                                {line.name} {/* Correct field reference for line name */}
                                            </option>
                                        ))}
                                    </select>

                                    <label>On Line Date:</label>
                                    <input
                                        type="date"
                                        value={onLineDate}
                                        onChange={(e) => setOnLineDate(e.target.value)}
                                    />
                                </div>

                                <div className="modal-buttons">
                                    <button onClick={handleSaveStyleToLine}>Save</button>
                                    {selectedStyle?.status === 'scheduled' && (
                                        <button onClick={() => handleDeleteStyle(selectedStyle.id)}>Remove</button>
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