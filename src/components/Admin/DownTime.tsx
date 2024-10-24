// src/components/Admin/DownTime.tsx

import React, { useState, useEffect } from 'react';
import {
    collection,
    getDocs,
    updateDoc,
    doc,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';
import { db } from '../../firebase';
import './DownTime.css';

interface Category {
    id: string;
    name: string;
    reasons: string[];
}

const DownTime: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [newReason, setNewReason] = useState('');
    const [updatedReason, setUpdatedReason] = useState('');
    const [reasonToEdit, setReasonToEdit] = useState<string | null>(null);
    const [showReasonModal, setShowReasonModal] = useState(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Fetch categories from Firestore
    const fetchCategories = async () => {
        setIsLoading(true);
        try {
            const categoriesRef = collection(db, 'downtimeCategories');
            const snapshot = await getDocs(categoriesRef);
            const categoryList: Category[] = snapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name,
                reasons: doc.data().reasons || []
            }));
            setCategories(categoryList);

            // Optionally, set the first category as selected
            if (categoryList.length > 0 && !selectedCategoryId) {
                setSelectedCategoryId(categoryList[0].id);
            }
        } catch (error) {
            console.error("Error fetching categories: ", error);
            alert("Failed to fetch categories.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    // Handle adding a new reason
    const handleAddReason = async () => {
        if (!newReason.trim()) {
            alert('Please provide a reason.');
            return;
        }

        if (!selectedCategoryId) {
            alert('Please select a category first.');
            return;
        }

        try {
            const categoryRef = doc(db, 'downtimeCategories', selectedCategoryId);
            await updateDoc(categoryRef, {
                reasons: arrayUnion(newReason.trim())
            });
            console.log(`Added reason "${newReason}" to category ID: ${selectedCategoryId}`);
            setNewReason('');

            // Update local state
            setCategories(prevCategories =>
                prevCategories.map(cat =>
                    cat.id === selectedCategoryId
                        ? { ...cat, reasons: [...cat.reasons, newReason.trim()] }
                        : cat
                )
            );
        } catch (error) {
            console.error('Error adding reason: ', error);
            alert('Failed to add reason.');
        }
    };

    // Handle deleting a reason
    const handleDeleteReason = async (reason: string) => {
        if (!selectedCategoryId) return;

        if (!window.confirm(`Are you sure you want to delete the reason "${reason}"?`)) return;

        try {
            const categoryRef = doc(db, 'downtimeCategories', selectedCategoryId);
            await updateDoc(categoryRef, {
                reasons: arrayRemove(reason)
            });
            console.log(`Deleted reason "${reason}" from category ID: ${selectedCategoryId}`);

            // Update local state
            setCategories(prevCategories =>
                prevCategories.map(cat =>
                    cat.id === selectedCategoryId
                        ? { ...cat, reasons: cat.reasons.filter(r => r !== reason) }
                        : cat
                )
            );
        } catch (error) {
            console.error('Error deleting reason: ', error);
            alert('Failed to delete reason.');
        }
    };

    // Open modal to edit a reason
    const openEditModal = (reason: string) => {
        setReasonToEdit(reason);
        setUpdatedReason(reason);
        setShowReasonModal(true);
    };

    // Handle saving the edited reason
    const handleSaveEditedReason = async () => {
        if (!updatedReason.trim() || !reasonToEdit || !selectedCategoryId) {
            alert('Please provide a valid reason.');
            return;
        }

        try {
            const categoryRef = doc(db, 'downtimeCategories', selectedCategoryId);
            const category = categories.find(cat => cat.id === selectedCategoryId);
            if (!category) {
                alert('Selected category does not exist.');
                return;
            }

            // Prevent duplicate reasons (case-insensitive)
            if (
                category.reasons.some(r => r.trim().toLowerCase() === updatedReason.trim().toLowerCase()) &&
                updatedReason.trim().toLowerCase() !== reasonToEdit.trim().toLowerCase()
            ) {
                alert('This reason already exists.');
                return;
            }

            // Remove the old reason and add the updated reason
            await updateDoc(categoryRef, {
                reasons: arrayRemove(reasonToEdit)
            });
            await updateDoc(categoryRef, {
                reasons: arrayUnion(updatedReason.trim())
            });

            console.log(`Updated reason from "${reasonToEdit}" to "${updatedReason}" in category ID: ${selectedCategoryId}`);
            setShowReasonModal(false);
            setReasonToEdit(null);
            setUpdatedReason('');

            // Update local state
            setCategories(prevCategories =>
                prevCategories.map(cat =>
                    cat.id === selectedCategoryId
                        ? {
                            ...cat,
                            reasons: cat.reasons.map(r =>
                                r === reasonToEdit ? updatedReason.trim() : r
                            )
                        }
                        : cat
                )
            );
        } catch (error) {
            console.error('Error updating reason: ', error);
            alert('Failed to update reason.');
        }
    };

    // Find the selected category based on selectedCategoryId
    const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);

    return (
        <div className="downtime-container">
            <div className="downtime-card">
                <div className="card-header">
                    <button className="back-button" onClick={() => window.history.back()}>
                        Back to Admin
                    </button>
                    <h1 className="title">Downtime Admin</h1>
                </div>
                <div className="downtime-content">
                    {/* Categories Section */}
                    <div className="categories-section">
                        <h2>Categories</h2>
                        {isLoading ? (
                            <p>Loading categories...</p>
                        ) : (
                            <ul className="categories-list">
                                {categories.map(category => (
                                    <li
                                        key={category.id}
                                        className={`category-item ${selectedCategoryId === category.id ? 'selected' : ''}`}
                                        onClick={() => setSelectedCategoryId(category.id)}
                                    >
                                        {category.name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    {/* Reasons Section */}
                    <div className="reasons-section">
                        <h2>Reasons for "{selectedCategory?.name || 'Select a Category'}"</h2>
                        {selectedCategory ? (
                            <>
                                <div className="add-reason">
                                    <input
                                        type="text"
                                        placeholder="New Reason"
                                        value={newReason}
                                        onChange={e => setNewReason(e.target.value)}
                                        className="reason-input"
                                    />
                                    <button onClick={handleAddReason} className="add-button">
                                        Add Reason
                                    </button>
                                </div>
                                <ul className="reasons-list">
                                    {selectedCategory.reasons.map((reason, index) => (
                                        <li key={index} className="reason-item">
                                            <span className="reason-name">{reason}</span>
                                            <div className="reason-actions">
                                                <button onClick={() => openEditModal(reason)} className="edit-button">
                                                    Edit
                                                </button>
                                                <button onClick={() => handleDeleteReason(reason)} className="delete-button">
                                                    Delete
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        ) : (
                            <p>Please select a category to view and manage reasons.</p>
                        )}
                    </div>
                </div>

                {/* Reason Edit Modal */}
                {showReasonModal && reasonToEdit && (
                    <div className="modal">
                        <div className="modal-content">
                            <h2>Edit Reason</h2>
                            <input
                                type="text"
                                value={updatedReason}
                                onChange={e => setUpdatedReason(e.target.value)}
                                placeholder="Reason Name"
                                className="reason-input"
                            />
                            <div className="modal-actions">
                                <button className="save-btn" onClick={handleSaveEditedReason}>
                                    Save
                                </button>
                                <button
                                    className="cancel-btn"
                                    onClick={() => setShowReasonModal(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

};

export default DownTime;