import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import Papa, { ParseResult } from 'papaparse';
import { db } from '../../firebase';
import './ProductHierarchyList.css';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { InputText } from 'primereact/inputtext';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';

interface Operation {
    id: string;
    name: string;
}

interface SubCategory {
    id: string;
    name: string;
    operations: Operation[];
}

interface Category {
    id: string;
    name: string;
    subCategories: SubCategory[];
}

const ProductHierarchyList: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryName, setCategoryName] = useState('');
    const [subCategoryName, setSubCategoryName] = useState('');
    const [operationName, setOperationName] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory | null>(null);
    const [selectedOperation, setSelectedOperation] = useState<Operation | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'category' | 'subcategory' | 'operation'>('category');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const categorySnapshot = await getDocs(collection(db, 'productHierarchy'));
            const categoryData = categorySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Category[];
            setCategories(categoryData);
        } catch (error) {
            console.error('Error fetching categories:', error);
            alert('Failed to fetch categories. Check the console for more details.');
        }
    };

    const openModal = (
        type: 'category' | 'subcategory' | 'operation',
        category?: Category,
        subCategory?: SubCategory,
        operation?: Operation
    ) => {
        setModalType(type);
        if (type === 'category' && category) {
            setSelectedCategory(category);
            setCategoryName(category.name);
        } else if (type === 'subcategory' && subCategory) {
            setSelectedSubCategory(subCategory);
            setSubCategoryName(subCategory.name);
            setSelectedCategory(category!); // Ensure category is selected
        } else if (type === 'operation' && operation) {
            setSelectedOperation(operation);
            setOperationName(operation.name);
            setSelectedSubCategory(subCategory!); // Ensure subcategory is selected
        } else {
            resetForm();
        }
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setSelectedCategory(null);
        setSelectedSubCategory(null);
        setSelectedOperation(null);
        setCategoryName('');
        setSubCategoryName('');
        setOperationName('');
    };

    const handleSave = async () => {
        try {
            if (modalType === 'category') {
                if (!categoryName.trim()) {
                    alert('Category name is required');
                    return;
                }

                const categoryData = {
                    name: categoryName,
                };

                if (selectedCategory) {
                    const categoryDoc = doc(db, 'productHierarchy', selectedCategory.id);
                    await updateDoc(categoryDoc, categoryData);
                } else {
                    await addDoc(collection(db, 'productHierarchy'), {...categoryData, subCategories: []});
                }
            } else if (modalType === 'subcategory') {
                if (!subCategoryName.trim() || !selectedCategory) {
                    alert('Subcategory name and parent category are required');
                    return;
                }

                const subCategoryData = {
                    name: subCategoryName,
                    operations: [],
                };

                if (selectedSubCategory) {
                    const categoryDoc = doc(db, 'productHierarchy', selectedCategory.id);
                    const updatedSubCategories = selectedCategory.subCategories.map((sub) =>
                        sub.id === selectedSubCategory.id ? {...sub, name: subCategoryName} : sub
                    );
                    await updateDoc(categoryDoc, {subCategories: updatedSubCategories});
                } else {
                    const categoryDoc = doc(db, 'productHierarchy', selectedCategory.id);
                    const newSubCategoryRef = await addDoc(collection(db, 'productHierarchy', selectedCategory.id, 'subCategories'), subCategoryData);
                    const newSubCategory: SubCategory = {
                        id: newSubCategoryRef.id,
                        name: subCategoryName,
                        operations: []
                    };
                    const updatedSubCategories = [...selectedCategory.subCategories, newSubCategory];
                    await updateDoc(categoryDoc, {subCategories: updatedSubCategories});
                }
            } else if (modalType === 'operation') {
                if (!operationName.trim() || !selectedSubCategory || !selectedCategory) {
                    alert('Operation name and parent subcategory are required');
                    return;
                }

                const operationData = {
                    name: operationName,
                };

                const subCategoryDocRef = doc(db, 'productHierarchy', selectedCategory.id, 'subCategories', selectedSubCategory.id);
                const newOperationRef = await addDoc(collection(subCategoryDocRef, 'operations'), operationData);
                const newOperation: Operation = {id: newOperationRef.id, name: operationName};
                const updatedOperations = [...selectedSubCategory.operations, newOperation];
                await updateDoc(subCategoryDocRef, {operations: updatedOperations});
            }

            resetForm();
            setIsModalOpen(false);
            fetchCategories();
        } catch (error) {
            console.error('Error saving hierarchy:', error);
            alert('Failed to save changes. Check the console for more details.');
        }
    };

    const handleDelete = async (
        type: 'category' | 'subcategory' | 'operation',
        categoryId: string,
        subCategoryId?: string,
        operationId?: string
    ) => {
        confirmDialog({
            message: `Are you sure you want to delete this ${type}?`,
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
                try {
                    const categoryDoc = doc(db, 'productHierarchy', categoryId);
                    const category = categories.find((cat) => cat.id === categoryId);
                    if (!category) return;

                    if (type === 'category') {
                        await deleteDoc(categoryDoc);
                    } else if (type === 'subcategory' && subCategoryId) {
                        const subCategoryDocRef = doc(db, 'productHierarchy', category.id, 'subCategories', subCategoryId);
                        await deleteDoc(subCategoryDocRef);
                        const updatedSubCategories = category.subCategories.filter(
                            (sub) => sub.id !== subCategoryId
                        );
                        await updateDoc(categoryDoc, {subCategories: updatedSubCategories});
                    } else if (type === 'operation' && subCategoryId && operationId) {
                        const operationDocRef = doc(db, 'productHierarchy', category.id, 'subCategories', subCategoryId, 'operations', operationId);
                        await deleteDoc(operationDocRef);
                        const updatedSubCategories = category.subCategories.map((sub) => {
                            if (sub.id === subCategoryId) {
                                const updatedOperations = sub.operations.filter((op) => op.id !== operationId);
                                return {...sub, operations: updatedOperations};
                            }
                            return sub;
                        });
                        await updateDoc(categoryDoc, {subCategories: updatedSubCategories});
                    }

                    fetchCategories();
                } catch (error) {
                    console.error('Error deleting hierarchy:', error);
                    alert('Failed to delete. Check the console for more details.');
                }
            },
        });
    };

    const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            complete: async (result: ParseResult<{ Category: string; SubCategory: string; Operation: string }>) => {
                const data = result.data;
                // Create a local copy of categories to work with
                let localCategories = [...categories];

                try {
                    for (const row of data) {
                        const {Category, SubCategory, Operation} = row;
                        console.log(`Processing row: ${Category}, ${SubCategory}, ${Operation}`);
                        if (!Category || !SubCategory || !Operation) {
                            console.warn('Skipping row due to missing fields:', row);
                            continue;
                        }

                        // Check if category exists in local copy
                        let category = localCategories.find((cat) => cat.name.toLowerCase() === Category.toLowerCase());
                        if (!category) {
                            const categoryRef = await addDoc(collection(db, 'productHierarchy'), {
                                name: Category,
                                subCategories: [],
                            });
                            category = {id: categoryRef.id, name: Category, subCategories: []};
                            localCategories.push(category);
                            console.log(`Added new category: ${Category}`);
                        }

                        // Check if subcategory exists in local copy
                        let subCategory = category.subCategories.find(
                            (sub) => sub.name.toLowerCase() === SubCategory.toLowerCase()
                        );
                        if (!subCategory) {
                            const subCategoryRef = await addDoc(collection(db, 'productHierarchy', category.id, 'subCategories'), {
                                name: SubCategory,
                                operations: [],
                            });
                            subCategory = {id: subCategoryRef.id, name: SubCategory, operations: []};
                            category.subCategories.push(subCategory);
                            console.log(`Added new subcategory: ${SubCategory} to category: ${Category}`);
                        }

                        // Check if operation exists in local copy
                        const operationExists = subCategory.operations.some(
                            (op) => op.name.toLowerCase() === Operation.toLowerCase()
                        );
                        if (!operationExists) {
                            const operationRef = await addDoc(collection(db, 'productHierarchy', category.id, 'subCategories', subCategory.id, 'operations'), {
                                name: Operation,
                            });
                            const newOperation: Operation = {id: operationRef.id, name: Operation};
                            subCategory.operations.push(newOperation);
                            console.log(`Added new operation: ${Operation} to subcategory: ${SubCategory}`);
                        }

                        // Optionally, update the category document with updated subcategories
                        await updateDoc(doc(db, 'productHierarchy', category.id), {
                            subCategories: category.subCategories.map((sub) => ({
                                id: sub.id,
                                name: sub.name,
                                operations: sub.operations,
                            })),
                        });
                    }

                    // Update the state after processing all rows
                    setCategories(localCategories);
                    alert('CSV uploaded successfully!');
                } catch (error) {
                    console.error('Error uploading CSV:', error);
                    alert('Failed to upload CSV. Check the console for more details.');
                }
            },
            skipEmptyLines: true,
        });
    };

    const downloadTemplate = () => {
        const csvContent =
            'data:text/csv;charset=utf-8,Category,SubCategory,Operation\nShirt,Mens Basic T,Join Shoulder\nShirt,Mens Basic T,Insert Sleeves\n';
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'product_hierarchy_template.csv');
        document.body.appendChild(link);
        link.click();
    };

    return (
        <div className="product-hierarchy-container">
            <ConfirmDialog/>
            <div className="toolbar">
                <Button onClick={() => openModal('category')}>Add Category</Button>
                <Button onClick={() => openModal('subcategory')}>Add Subcategory</Button>
                <Button onClick={() => openModal('operation')}>Add Operation</Button>
                <Button onClick={() => document.getElementById('csvFileInput')?.click()}>Upload CSV</Button>
                <Button onClick={downloadTemplate}>Download CSV Template</Button>
                <input
                    type="file"
                    id="csvFileInput"
                    accept=".csv"
                    style={{display: 'none'}}
                    onChange={handleCSVUpload}
                />
            </div>

            <div className="main-content">
                <h2>Product Hierarchy</h2>
                <InputText
                    className="search-box"
                    type="text"
                    placeholder="Search by Category, Subcategory, or Operation"
                    onChange={(e) => setSearchTerm(e.target.value)}
                />

                <div className="table-container">
                    <table className="product-hierarchy-table">
                        <thead>
                        <tr>
                            <th>Category</th>
                            <th>Subcategory</th>
                            <th>Operation</th>
                            <th>Edit</th>
                            <th>Delete</th>
                        </tr>
                        </thead>
                        <tbody>
                        {categories
                            .filter(
                                (cat) =>
                                    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    cat.subCategories.some(
                                        (sub) =>
                                            sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            sub.operations.some((op) =>
                                                op.name.toLowerCase().includes(searchTerm.toLowerCase())
                                            )
                                    )
                            )
                            .map((category) =>
                                category.subCategories.map((subCategory) =>
                                    subCategory.operations.map((operation) => (
                                        <tr key={`${category.id}-${subCategory.id}-${operation.id}`}>
                                            <td>{category.name}</td>
                                            <td>{subCategory.name}</td>
                                            <td>{operation.name}</td>
                                            <td>
                                                <IconButton
                                                    onClick={() => openModal('operation', category, subCategory, operation)}>
                                                    <EditIcon/>
                                                </IconButton>
                                            </td>
                                            <td>
                                                <IconButton
                                                    onClick={() =>
                                                        handleDelete(
                                                            'operation',
                                                            category.id,
                                                            subCategory.id,
                                                            operation.id
                                                        )
                                                    }
                                                >
                                                    <DeleteIcon/>
                                                </IconButton>
                                            </td>
                                        </tr>
                                    ))
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>
                            {modalType === 'category'
                                ? selectedCategory
                                    ? 'Edit Category'
                                    : 'Add Category'
                                : modalType === 'subcategory'
                                    ? selectedSubCategory
                                        ? 'Edit Subcategory'
                                        : 'Add Subcategory'
                                    : selectedOperation
                                        ? 'Edit Operation'
                                        : 'Add Operation'}
                        </h2>
                        <div className="input-container">
                            {modalType === 'category' && (
                                <>
                                    <label htmlFor="categoryName">Category Name:</label>
                                    <InputText
                                        id="categoryName"
                                        value={categoryName}
                                        onChange={(e) => setCategoryName(e.target.value)}
                                    />
                                </>
                            )}

                            {modalType === 'subcategory' && (
                                <>
                                    <label htmlFor="parentCategory">Parent Category:</label>
                                    <select
                                        id="parentCategory"
                                        value={selectedCategory ? selectedCategory.id : ''}
                                        onChange={(e) => {
                                            const cat = categories.find((c) => c.id === e.target.value) || null;
                                            setSelectedCategory(cat);
                                        }}
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                    <label htmlFor="subCategoryName">Subcategory Name:</label>
                                    <InputText
                                        id="subCategoryName"
                                        value={subCategoryName}
                                        onChange={(e) => setSubCategoryName(e.target.value)}
                                    />
                                </>
                            )}

                            {modalType === 'operation' && (
                                <>
                                    <label htmlFor="parentCategory">Parent Category:</label>
                                    <select
                                        id="parentCategory"
                                        value={selectedCategory ? selectedCategory.id : ''}
                                        onChange={(e) => {
                                            const cat = categories.find((c) => c.id === e.target.value) || null;
                                            setSelectedCategory(cat);
                                        }}
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                    <label htmlFor="parentSubCategory">Parent Subcategory:</label>
                                    <select
                                        id="parentSubCategory"
                                        value={selectedSubCategory ? selectedSubCategory.id : ''}
                                        onChange={(e) => {
                                            const sub =
                                                selectedCategory?.subCategories.find((s) => s.id === e.target.value) ||
                                                null;
                                            setSelectedSubCategory(sub);
                                        }}
                                        disabled={!selectedCategory}
                                    >
                                        <option value="">Select Subcategory</option>
                                        {selectedCategory &&
                                            selectedCategory.subCategories.map((sub) => (
                                                <option key={sub.id} value={sub.id}>
                                                    {sub.name}
                                                </option>
                                            ))}
                                    </select>
                                    <label htmlFor="operationName">Operation Name:</label>
                                    <InputText
                                        id="operationName"
                                        value={operationName}
                                        onChange={(e) => setOperationName(e.target.value)}
                                    />
                                </>
                            )}
                        </div>
                        <div className="modal-buttons">
                            <Button className="save-btn" onClick={handleSave}>
                                Save
                            </Button>
                            <Button className="cancel-btn" onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
    export default ProductHierarchyList;