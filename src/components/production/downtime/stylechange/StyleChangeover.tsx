// src/components/production/downtime/stylechange/StyleChangeover.tsx

import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDoc, getDocs, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import './StyleChangeover.css';

interface StyleChangeoverProps {
    onClose: () => void;
    onSubmit: (data: StyleChangeoverFormData) => Promise<void>;
    productionLineId: string;
    supervisorId: string;
}

interface StyleChangeoverFormData {
    currentStyle: string;
    nextStyle: string;
    target: string;
    productionLineId: string;
    supervisorId: string;
}

interface StyleItem {
    id: string;
    styleNumber: string;
}

const StyleChangeover: React.FC<StyleChangeoverProps> = ({
                                                             onClose,
                                                             onSubmit,
                                                             productionLineId,
                                                             supervisorId,
                                                         }) => {
    const [currentStyle, setCurrentStyle] = useState<string>('Unknown');
    const [nextStyle, setNextStyle] = useState<string>('');
    const [target, setTarget] = useState<string>('');
    const [stylesList, setStylesList] = useState<StyleItem[]>([]);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const fetchCurrentStyle = async () => {
            try {
                const lineDoc = await getDoc(doc(db, 'productionLines', productionLineId));
                setCurrentStyle(lineDoc.data()?.currentStyle || 'Unknown');
            } catch (error) {
                console.error('Error fetching current style:', error);
                setError('Failed to load current style.');
            }
        };

        const fetchStyles = async () => {
            try {
                const stylesSnapshot = await getDocs(collection(db, 'styles'));
                const stylesData = stylesSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    styleNumber: doc.data().styleNumber,
                }));
                setStylesList(stylesData);
            } catch (error) {
                console.error('Error fetching styles:', error);
                setError('Failed to load styles.');
            }
        };

        fetchCurrentStyle();
        fetchStyles();
    }, [productionLineId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!nextStyle || !target) {
            setError('Please fill in all required fields.');
            return;
        }

        const styleChangeoverData: StyleChangeoverFormData = {
            currentStyle,
            nextStyle,
            target,
            productionLineId,
            supervisorId,
        };

        try {
            await onSubmit(styleChangeoverData); // Using onSubmit prop
            alert('Style changeover initiated successfully.');
            onClose();
        } catch (err) {
            console.error('Error initiating style changeover:', err);
            setError('Failed to initiate style changeover.');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Style Changeover</h2>
                {error && <p className="error-message">{error}</p>}
                <form onSubmit={handleSubmit} className="style-change-log-form">
                    <p>
                        <strong>Current Style:</strong> {currentStyle}
                    </p>
                    <label>
                        Next Style:
                        <select value={nextStyle} onChange={(e) => setNextStyle(e.target.value)} required>
                            <option value="">Select Next Style</option>
                            {stylesList.map((style) => (
                                <option key={style.id} value={style.styleNumber}>
                                    {style.styleNumber}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Target:
                        <input
                            type="number"
                            value={target}
                            onChange={(e) => setTarget(e.target.value)}
                            required
                        />
                    </label>
                    <div className="form-buttons">
                        <button type="submit" className="submit-button">
                            Confirm
                        </button>
                        <button type="button" onClick={onClose} className="cancel-button">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StyleChangeover;