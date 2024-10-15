import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc } from 'firebase/firestore';
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
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newReason, setNewReason] = useState('');
    const [updatedCategoryName, setUpdatedCategoryName] = useState('');
    const [selectedReason, setSelectedReason] = useState<string | null>(null);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showReasonModal, setShowReasonModal] = useState(false);

    const fetchCategories = async () => {
        const categorySnapshot = await getDocs(collection(db, 'downtimeCategories'));
        const categoryList = categorySnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            reasons: doc.data().reasons || []
        }));
        setCategories(categoryList);
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleAddCategory = async () => {
        if (!newCategoryName) {
            alert('Please provide a category name.');
            return;
        }

        await addDoc(collection(db, 'downtimeCategories'), {
            name: newCategoryName,
            reasons: []
        });
        setNewCategoryName('');
        fetchCategories();
    };

    const handleDeleteCategory = async (categoryId: string) => {
        await deleteDoc(doc(db, 'downtimeCategories', categoryId));
        fetchCategories();
    };

    const handleEditCategory = async (categoryId: string) => {
        const updatedCategories = categories.map(cat =>
            cat.id === categoryId ? { ...cat, name: updatedCategoryName } : cat
        );
        const selectedCat = updatedCategories.find(cat => cat.id === categoryId);
        if (selectedCat) {
            await updateDoc(doc(db, 'downtimeCategories', categoryId), {
                name: selectedCat.name,
                reasons: selectedCat.reasons
            });
        }
        setUpdatedCategoryName('');
        setShowCategoryModal(false);
        fetchCategories();
    };

    const handleAddReason = async (categoryId: string) => {
        if (!newReason) {
            alert('Please provide a reason.');
            return;
        }

        const updatedCategories = categories.map(cat =>
            cat.id === categoryId
                ? { ...cat, reasons: [...cat.reasons, newReason] }
                : cat
        );
        const selectedCat = updatedCategories.find(cat => cat.id === categoryId);

        if (selectedCat) {
            await updateDoc(doc(db, 'downtimeCategories', categoryId), {
                name: selectedCat.name,
                reasons: selectedCat.reasons
            });
        }
        setNewReason('');
        fetchCategories();
    };

    const handleDeleteReason = async (categoryId: string, reason: string) => {
        const updatedCategories = categories.map(cat =>
            cat.id === categoryId
                ? { ...cat, reasons: cat.reasons.filter(r => r !== reason) }
                : cat
        );
        const selectedCat = updatedCategories.find(cat => cat.id === categoryId);

        if (selectedCat) {
            await updateDoc(doc(db, 'downtimeCategories', categoryId), {
                name: selectedCat.name,
                reasons: selectedCat.reasons
            });
        }
        fetchCategories();
    };

    const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);

    return (
        <div className="downtime-container">
            <div className="downtime-card">
                <div className="card-header">
                    <button className="back-button" onClick={() => window.history.back()}>Back to Admin</button>
                    <h1 className="title">Downtime Admin</h1>
                </div>
                <div className="downtime-content">
                    <div className="categories-section">
                        <h2>Categories</h2>
                        <ul>
                            {categories.map(category => (
                                <li key={category.id} className="category-item">
                                    <div
                                        className="category-name"
                                        onClick={() => setSelectedCategoryId(category.id)}
                                    >
                                        {category.name}
                                    </div>
                                    <button
                                        className="edit-btn"
                                        onClick={() => { setShowCategoryModal(true); setUpdatedCategoryName(category.name); setSelectedCategoryId(category.id); }}
                                    >
                                        Edit
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <input
                            type="text"
                            placeholder="New Category"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                        />
                        <button className="add-category-btn" onClick={handleAddCategory}>Add Category</button>
                    </div>
                    <div className="reasons-section">
                        <h2>Reasons</h2>
                        {selectedCategoryId ? (
                            <>
                                {selectedCategory?.reasons.map((reason, index) => (
                                    <div key={index} className="reason-item">
                                        <div className="reason-name">{reason}</div>
                                        <button
                                            className="edit-btn"
                                            onClick={() => { setShowReasonModal(true); setSelectedReason(reason); }}
                                        >
                                            Edit
                                        </button>
                                    </div>
                                ))}
                                <input
                                    type="text"
                                    placeholder="New Reason"
                                    value={newReason}
                                    onChange={(e) => setNewReason(e.target.value)}
                                />
                                <button className="add-reason-btn" onClick={() => handleAddReason(selectedCategoryId!)}>Add Reason</button>
                            </>
                        ) : (
                            <p>Please select a category to view reasons</p>
                        )}
                    </div>
                </div>

                {/* Category Modal */}
                {showCategoryModal && (
                    <div className="modal">
                        <div className="modal-content">
                            <h2>Edit Category</h2>
                            <input
                                type="text"
                                placeholder="Rename Category"
                                value={updatedCategoryName}
                                onChange={(e) => setUpdatedCategoryName(e.target.value)}
                            />
                            <button className="save-btn" onClick={() => handleEditCategory(selectedCategoryId!)}>Save</button>
                            <button className="delete-btn" onClick={() => handleDeleteCategory(selectedCategoryId!)}>Delete</button>
                            <button className="cancel-btn" onClick={() => setShowCategoryModal(false)}>Cancel</button>
                        </div>
                    </div>
                )}

                {/* Reason Modal */}
                {showReasonModal && (
                    <div className="modal">
                        <div className="modal-content">
                            <h2>Edit Reason</h2>
                            <input
                                type="text"
                                placeholder="Rename Reason"
                                value={selectedReason || ''}
                                onChange={(e) => setSelectedReason(e.target.value)}
                            />
                            <button className="save-btn" onClick={() => setShowReasonModal(false)}>Save</button>
                            <button className="delete-btn" onClick={() => handleDeleteReason(selectedCategoryId!, selectedReason!)}>Delete</button>
                            <button className="cancel-btn" onClick={() => setShowReasonModal(false)}>Cancel</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DownTime;