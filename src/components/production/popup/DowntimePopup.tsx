// src/components/production/popup/DowntimePopup.tsx
import React, { useState } from 'react';
import StyleChangeOver from './StyleChangeOver';
import SupplyDowntime from './SupplyDowntime';
import MaintenanceDowntime from './MaintenanceDowntime';
import './DowntimePopup.css';

interface DowntimeCategory {
    categoryName: string;
    reasons: string[];
}

interface DowntimePopupProps {
    onClose: () => void;
    onSubmit: (data: any) => void; // Define a proper type based on your data structure
    downtimeCategories: DowntimeCategory[];
}

const DowntimePopup: React.FC<DowntimePopupProps> = ({ onClose, downtimeCategories, onSubmit }) => {
    const [selectedCategory, setSelectedCategory] = useState<string>('');

    const renderCategoryComponent = () => {
        switch (selectedCategory) {
            case 'Style Change Over':
                return <StyleChangeOver onClose={onClose} onSubmit={onSubmit} />;
            case 'Supply':
                return <SupplyDowntime onClose={onClose} onSubmit={onSubmit} />;
            case 'Maintenance':
                return <MaintenanceDowntime onClose={onClose} onSubmit={onSubmit} />;
            default:
                return (
                    <>
                        <h2>Record Downtime</h2>
                        <label>
                            Downtime Category:
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <option value="">Select a Category</option>
                                {downtimeCategories.map((dc, index) => (
                                    <option key={index} value={dc.categoryName}>{dc.categoryName}</option>
                                ))}
                            </select>
                        </label>
                        <button className="cancel-button" onClick={onClose}>Cancel</button>
                    </>
                );
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                {renderCategoryComponent()}
            </div>
        </div>
    );
};

export default DowntimePopup;