// src/components/Admin/DownTime.tsx

import React, { useState } from 'react';
import './DownTime.css';

interface Category {
    id: number;
    name: string;
    reasons: string[];
}

const defaultCategories = [
    { id: 1, name: 'Machine', reasons: [] },
    { id: 2, name: 'Change over', reasons: [] },
    { id: 3, name: 'Quality', reasons: [] },
    { id: 4, name: 'Rework', reasons: [] },
    { id: 5, name: 'Reject', reasons: [] },
    { id: 6, name: 'Supply', reasons: [] },
    { id: 7, name: 'Late', reasons: [] },
];

const DownTime: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>(defaultCategories);
    const [newCategory, setNewCategory] = useState<string>('');
    const [newReason, setNewReason] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

    const handleAddCategory = () => {
        if (newCategory.trim() === '') {
            alert('Please enter a category name.');
            return;
        }
        const newId = categories.length + 1;
        setCategories([...categories, { id: newId, name: newCategory, reasons: [] }]);
        setNewCategory('');
    };

    const handleAddReason = (categoryId: number) => {
        if (newReason.trim() === '') {
            alert('Please enter a reason.');
            return;
        }
        const updatedCategories = categories.map((category) =>
            category.id === categoryId
                ? { ...category, reasons: [...category.reasons, newReason] }
                : category
        );
        setCategories(updatedCategories);
        setNewReason('');
        setSelectedCategory(null);
    };

    return (
        <div className="downtime-container">
            <div className="downtime-card">
                <div className="card-header">
                    <h1 className="company-name">Manage Downtime</h1>
                    <button className="back-button" onClick={() => window.history.back()}>
                        Back to Admin
                    </button>
                </div>
                <div className="card-content">
                    <div className="categories-list">
                        {categories.map((category) => (
                            <div key={category.id} className="category-item">
                                <h2>{category.name}</h2>
                                <ul className="reasons-list">
                                    {category.reasons.map((reason, index) => (
                                        <li key={index}>{reason}</li>
                                    ))}
                                </ul>
                                <button
                                    className="add-reason-button"
                                    onClick={() => setSelectedCategory(category.id)}
                                >
                                    Add Reason
                                </button>
                                {selectedCategory === category.id && (
                                    <div className="reason-form">
                                        <input
                                            type="text"
                                            value={newReason}
                                            onChange={(e) => setNewReason(e.target.value)}
                                            placeholder="Enter reason..."
                                        />
                                        <button
                                            onClick={() => handleAddReason(category.id)}
                                        >
                                            Save Reason
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="add-category">
                        <h2>Add Other Category</h2>
                        <input
                            type="text"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="Enter new category..."
                        />
                        <button onClick={handleAddCategory}>Add Category</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DownTime;