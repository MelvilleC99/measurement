import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import './StyleCard.css';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { InputText } from 'primereact/inputtext'; // For cleaner input fields
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog'; // For delete confirmation

interface Style {
    id: string;
    styleName: string;
    styleNumber: string;
    productType: string;
    productCategory: string;
    unitsInOrder: number;
    cost: number;
    deliveryDate: string;
    status: string;
}

const StyleCard: React.FC = () => {
    const [styles, setStyles] = useState<Style[]>([]);
    const [styleName, setStyleName] = useState('');
    const [styleNumber, setStyleNumber] = useState('');
    const [productType, setProductType] = useState('');
    const [productCategory, setProductCategory] = useState('');
    const [unitsInOrder, setUnitsInOrder] = useState<number | ''>('');
    const [cost, setCost] = useState<number | ''>('');
    const [deliveryDate, setDeliveryDate] = useState('');
    const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchStyles();
    }, []);

    // Fetch styles from Firestore
    const fetchStyles = async () => {
        const stylesSnapshot = await getDocs(collection(db, 'styles'));
        const stylesData = stylesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Style[];
        setStyles(stylesData);
    };

    // Open modal for adding or editing a style
    const openModal = (style?: Style) => {
        if (style) {
            setSelectedStyle(style);
            setStyleName(style.styleName);
            setStyleNumber(style.styleNumber);
            setProductType(style.productType);
            setProductCategory(style.productCategory);
            setUnitsInOrder(style.unitsInOrder);
            setCost(style.cost);
            setDeliveryDate(style.deliveryDate);
        } else {
            resetForm();
        }
        setIsModalOpen(true);
    };

    // Reset form fields
    const resetForm = () => {
        setSelectedStyle(null);
        setStyleName('');
        setStyleNumber('');
        setProductType('');
        setProductCategory('');
        setUnitsInOrder('');
        setCost('');
        setDeliveryDate('');
    };

    // Save or update style in Firestore
    const handleSaveStyle = async () => {
        if (!styleName || !styleNumber || !productType || !productCategory || unitsInOrder === '' || cost === '' || !deliveryDate) {
            alert('Please fill out all the fields');
            return;
        }

        try {
            if (selectedStyle) {
                // Update existing style
                const styleDoc = doc(db, 'styles', selectedStyle.id); // Correct document reference
                await updateDoc(styleDoc, {
                    styleName,
                    styleNumber,
                    productType,
                    productCategory,
                    unitsInOrder,
                    cost,
                    deliveryDate,
                });
            } else {
                // Add new style
                await addDoc(collection(db, 'styles'), {
                    styleName,
                    styleNumber,
                    productType,
                    productCategory,
                    unitsInOrder,
                    cost,
                    deliveryDate,
                    status: 'open',
                });
            }

            resetForm();
            setIsModalOpen(false);
            fetchStyles(); // Refresh the styles list
        } catch (error) {
            console.error('Error saving style:', error);
            alert('An error occurred while saving the style');
        }
    };

    // Delete style
    const handleDeleteStyle = async (id: string) => {
        confirmDialog({
            message: 'Are you sure you want to delete this style?',
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
                const styleDoc = doc(db, 'styles', id); // Ensure proper document reference
                await deleteDoc(styleDoc);
                fetchStyles();
            },
        });
    };

    return (
        <div className="style-card-container">
            <ConfirmDialog />
            <div className="toolbar">
                <button onClick={() => openModal()}>Load Style</button>
            </div>

            <div className="content-area">
                <h2>Styles</h2>
                <div className="search-bar">
                    <InputText
                        type="text"
                        placeholder="Search by Style Number..."
                        onChange={(e) => {
                            const searchTerm = e.target.value.toLowerCase();
                            setStyles(
                                styles.filter((style) =>
                                    style.styleNumber.toLowerCase().includes(searchTerm)
                                )
                            );
                        }}
                    />
                </div>
                <table className="styles-table">
                    <thead>
                    <tr>
                        <th>Style Number</th>
                        <th>Style Name</th>
                        <th>Description</th>
                        <th>Delivery Date</th>
                        <th>Edit</th>
                        <th>Delete</th>
                    </tr>
                    </thead>
                    <tbody>
                    {styles.map((style) => (
                        <tr key={style.id}>
                            <td>{style.styleNumber}</td>
                            <td>{style.styleName}</td>
                            <td>{style.productCategory}</td>
                            <td>{style.deliveryDate}</td>
                            <td>
                                <IconButton onClick={() => openModal(style)}>
                                    <EditIcon />
                                </IconButton>
                            </td>
                            <td>
                                <IconButton onClick={() => handleDeleteStyle(style.id)}>
                                    <DeleteIcon />
                                </IconButton>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>{selectedStyle ? 'Edit Style' : 'Add Style'}</h2>
                        <div className="input-container">
                            <label htmlFor="styleName">Style Name:</label>
                            <InputText
                                id="styleName"
                                value={styleName}
                                onChange={(e) => setStyleName(e.target.value)}
                            />
                            <label htmlFor="styleNumber">Style Number:</label>
                            <InputText
                                id="styleNumber"
                                value={styleNumber}
                                onChange={(e) => setStyleNumber(e.target.value)}
                            />
                            <label htmlFor="productType">Product Type:</label>
                            <InputText
                                id="productType"
                                value={productType}
                                onChange={(e) => setProductType(e.target.value)}
                            />
                            <label htmlFor="productCategory">Product Category:</label>
                            <InputText
                                id="productCategory"
                                value={productCategory}
                                onChange={(e) => setProductCategory(e.target.value)}
                            />
                            <label htmlFor="unitsInOrder">Units in Order:</label>
                            <InputText
                                type="number"
                                id="unitsInOrder"
                                value={unitsInOrder !== '' ? String(unitsInOrder) : ''}
                                onChange={(e) => setUnitsInOrder(Number(e.target.value))}
                            />
                            <label htmlFor="cost">Cost:</label>
                            <InputText
                                type="number"
                                id="cost"
                                value={cost !== '' ? String(cost) : ''}
                                onChange={(e) => setCost(Number(e.target.value))}
                            />
                            <label htmlFor="deliveryDate">Delivery Date:</label>
                            <InputText
                                type="date"
                                id="deliveryDate"
                                value={deliveryDate}
                                onChange={(e) => setDeliveryDate(e.target.value)}
                            />
                        </div>
                        <div className="modal-buttons">
                            <Button className="save-btn" onClick={handleSaveStyle}>
                                {selectedStyle ? 'Save Changes' : 'Save'}
                            </Button>
                            <Button className="cancel-btn" onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </Button>
                            {selectedStyle && (
                                <Button
                                    className="delete-btn"
                                    onClick={() => handleDeleteStyle(selectedStyle.id)}
                                >
                                    Delete
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StyleCard;