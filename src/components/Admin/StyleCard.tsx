import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import Papa, { ParseResult } from 'papaparse';
import { db } from '../../firebase';
import './StyleCard.css';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { InputText } from 'primereact/inputtext';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';

interface Style {
    id: string;
    styleDescription: string;
    styleNumber: string;
    productType: string;
    productCategory: string;
    unitsInOrder: number;
    unitsProduced: number;
    cost: number;
    deliveryDate: string;
    customer: string; // New field for customer
    smv: number; // New field for SMV
    status: string; // Added status field
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

const StyleCard: React.FC = () => {
    const [styles, setStyles] = useState<Style[]>([]);
    const [styleDescription, setStyleDescription] = useState<string>('');
    const [styleNumber, setStyleNumber] = useState<string>('');
    const [productType, setProductType] = useState<string>('');
    const [productCategory, setProductCategory] = useState<string>('');
    const [unitsInOrder, setUnitsInOrder] = useState<number>(0);
    const [unitsProduced, setUnitsProduced] = useState<number>(0);
    const [cost, setCost] = useState<number>(0);
    const [deliveryDate, setDeliveryDate] = useState<string>('');
    const [customer, setCustomer] = useState<string>(''); // New state for customer
    const [smv, setSmv] = useState<number>(0); // New state for SMV
    const [status, setStatus] = useState<string>('open'); // New state for status
    const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

    useEffect(() => {
        fetchStyles();
    }, []);

    const fetchStyles = async () => {
        try {
            const stylesSnapshot = await getDocs(collection(db, 'styles'));
            const stylesData = stylesSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Style[];
            setStyles(stylesData);
        } catch (error) {
            console.error('Error fetching styles:', error);
        }
    };

    const downloadTemplate = () => {
        const headers = [
            'Style Description',
            'Style Number',
            'Product Type',
            'Product Category',
            'Units In Order',
            'Cost',
            'Delivery Date',
            'Customer', // New field in CSV template
            'SMV' // New field in CSV template
        ].join(',');
        const csvContent = `data:text/csv;charset=utf-8,${headers}\n`;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'style_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            complete: async (result: ParseResult<{ [key: string]: string }>) => {
                const data = result.data;
                for (const row of data) {
                    try {
                        await addDoc(collection(db, 'styles'), {
                            styleDescription: row['Style Description'],
                            styleNumber: row['Style Number'],
                            productType: row['Product Type'],
                            productCategory: row['Product Category'],
                            unitsInOrder: Number(row['Units In Order']) || 0,
                            unitsProduced: 0,
                            cost: Number(row['Cost']) || 0,
                            deliveryDate: row['Delivery Date'],
                            customer: row['Customer'] || '', // New field for customer
                            smv: Number(row['SMV']) || 0, // New field for SMV
                            status: 'open', // Default status
                            createdAt: Timestamp.now(),
                            updatedAt: Timestamp.now()
                        });
                    } catch (error) {
                        console.error('Error adding style from CSV:', error);
                    }
                }
                fetchStyles();
                if (event.target) {
                    event.target.value = '';
                }
            },
            skipEmptyLines: true,
        });
    };

    const openModal = (style?: Style) => {
        if (style) {
            setSelectedStyle(style);
            setStyleDescription(style.styleDescription);
            setStyleNumber(style.styleNumber);
            setProductType(style.productType);
            setProductCategory(style.productCategory);
            setUnitsInOrder(style.unitsInOrder);
            setUnitsProduced(style.unitsProduced);
            setCost(style.cost);
            setDeliveryDate(style.deliveryDate);
            setCustomer(style.customer || ''); // Set customer
            setSmv(style.smv || 0); // Set SMV
            setStatus(style.status); // Set status
        } else {
            resetForm();
        }
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setSelectedStyle(null);
        setStyleDescription('');
        setStyleNumber('');
        setProductType('');
        setProductCategory('');
        setUnitsInOrder(0);
        setUnitsProduced(0);
        setCost(0);
        setDeliveryDate('');
        setCustomer(''); // Reset customer
        setSmv(0); // Reset SMV
        setStatus('open'); // Reset status
    };

    const handleSaveStyle = async () => {
        if (!styleDescription || !styleNumber || !productType || !productCategory || !deliveryDate) {
            alert('Please fill out all required fields');
            return;
        }

        if (unitsInOrder < 0) {
            alert('Units in order cannot be negative');
            return;
        }

        if (unitsProduced > unitsInOrder) {
            alert('Units produced cannot exceed units in order');
            return;
        }

        try {
            const styleData = {
                styleDescription,
                styleNumber,
                productType,
                productCategory,
                unitsInOrder,
                unitsProduced,
                cost,
                deliveryDate,
                customer,  // Include customer
                smv,       // Include SMV
                status,    // Include status
                updatedAt: Timestamp.now(),
                createdAt: selectedStyle ? selectedStyle.createdAt : Timestamp.now()
            };

            if (selectedStyle) {
                // Update existing style
                const styleDoc = doc(db, 'styles', selectedStyle.id);
                await updateDoc(styleDoc, styleData);
            } else {
                // Add new style
                await addDoc(collection(db, 'styles'), styleData);
            }

            resetForm();
            setIsModalOpen(false);
            fetchStyles();
        } catch (error) {
            console.error('Error saving style:', error);
            alert('An error occurred while saving the style');
        }
    };

    const handleDeleteStyle = async (id: string) => {
        confirmDialog({
            message: 'Are you sure you want to delete this style?',
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
                try {
                    const styleDoc = doc(db, 'styles', id);
                    await deleteDoc(styleDoc);
                    fetchStyles();
                } catch (error) {
                    console.error('Error deleting style:', error);
                    alert('An error occurred while deleting the style');
                }
            }
        });
    };

    return (
        <div className="style-card-container">
            <ConfirmDialog />
            <div className="toolbar">
                <button onClick={() => openModal()}>Load Style</button>
                <button onClick={() => document.getElementById('csvFileInput')?.click()}>
                    Upload CSV
                </button>
                <button onClick={downloadTemplate}>Download CSV Template</button>
                <input
                    type="file"
                    id="csvFileInput"
                    accept=".csv"
                    style={{ display: 'none' }}
                    onChange={handleCSVUpload}
                />
            </div>

            <div className="content-area">
                <h2>Styles</h2>
                <div className="search-bar">
                    <InputText
                        type="text"
                        placeholder="Search by Style Number..."
                        onChange={(e) => {
                            const searchTerm = e.target.value.toLowerCase();
                            const filteredStyles = styles.filter((style) =>
                                style.styleNumber.toLowerCase().includes(searchTerm)
                            );
                            setStyles(filteredStyles);
                        }}
                    />
                </div>
                <table className="styles-table">
                    <thead>
                    <tr>
                        <th>Style Number</th>
                        <th>Style Description</th>
                        <th>Product Type</th>
                        <th>Product Category</th>
                        <th>Units In Order</th>
                        <th>Units Produced</th>
                        <th>Balance</th>
                        <th>Cost</th>
                        <th>Delivery Date</th>
                        <th>Customer</th> {/* New Column */}
                        <th>SMV</th> {/* New Column */}
                        <th>Status</th> {/* New Column */}
                        <th>Edit</th>
                        <th>Delete</th>
                    </tr>
                    </thead>
                    <tbody>
                    {styles.map((style) => (
                        <tr key={style.id}>
                            <td>{style.styleNumber}</td>
                            <td>{style.styleDescription}</td>
                            <td>{style.productType}</td>
                            <td>{style.productCategory}</td>
                            <td>{style.unitsInOrder}</td>
                            <td>{style.unitsProduced}</td>
                            <td>{style.unitsInOrder - style.unitsProduced}</td>
                            <td>{style.cost}</td>
                            <td>{style.deliveryDate}</td>
                            <td>{style.customer}</td> {/* Display customer */}
                            <td>{style.smv}</td> {/* Display SMV */}
                            <td>{style.status}</td> {/* Display status */}
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
                            <label>
                                Style Description:
                                <InputText
                                    value={styleDescription}
                                    onChange={(e) => setStyleDescription(e.target.value)}
                                />
                            </label>
                            <label>
                                Style Number:
                                <InputText
                                    value={styleNumber}
                                    onChange={(e) => setStyleNumber(e.target.value)}
                                />
                            </label>
                            <label>
                                Product Type:
                                <InputText
                                    value={productType}
                                    onChange={(e) => setProductType(e.target.value)}
                                />
                            </label>
                            <label>
                                Product Category:
                                <InputText
                                    value={productCategory}
                                    onChange={(e) => setProductCategory(e.target.value)}
                                />
                            </label>
                            <label>
                                Units in Order:
                                <InputText
                                    type="number"
                                    value={unitsInOrder.toString()}
                                    onChange={(e) => setUnitsInOrder(Math.max(0, Number(e.target.value)))}
                                />
                            </label>
                            {selectedStyle && (
                                <label>
                                    Units Produced:
                                    <InputText
                                        type="number"
                                        value={unitsProduced.toString()}
                                        onChange={(e) => {
                                            const value = Math.max(0, Number(e.target.value));
                                            setUnitsProduced(Math.min(value, unitsInOrder));
                                        }}
                                    />
                                </label>
                            )}
                            <label>
                                Cost:
                                <InputText
                                    type="number"
                                    value={cost.toString()}
                                    onChange={(e) => setCost(Math.max(0, Number(e.target.value)))}
                                />
                            </label>
                            <label>
                                Delivery Date:
                                <InputText
                                    type="date"
                                    value={deliveryDate}
                                    onChange={(e) => setDeliveryDate(e.target.value)}
                                />
                            </label>
                            <label>
                                Customer:
                                <InputText
                                    value={customer}
                                    onChange={(e) => setCustomer(e.target.value)}
                                />
                            </label>
                            <label>
                                SMV (Standard Minute Value):
                                <InputText
                                    type="number"
                                    value={smv.toString()}
                                    onChange={(e) => setSmv(Math.max(0, Number(e.target.value)))}
                                />
                            </label>
                            <label>
                                Status:
                                <InputText
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                />
                            </label>
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
