import React, { useState, useEffect } from 'react';
import './ProductionLines.css';

interface ProductionLine {
    id: number;
    lineName: string;
}

const ProductionLines: React.FC = () => {
    const [lineName, setLineName] = useState<string>('');
    const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);

    // Load production lines from localStorage on component mount
    useEffect(() => {
        const savedLines = localStorage.getItem('productionLines');
        if (savedLines) {
            setProductionLines(JSON.parse(savedLines));
        }
    }, []);

    // Save production lines to localStorage whenever productionLines state changes
    useEffect(() => {
        if (productionLines.length > 0) {
            localStorage.setItem('productionLines', JSON.stringify(productionLines));
        }
    }, [productionLines]);

    const handleAddLine = () => {
        if (lineName.trim() === '') {
            alert('Please enter a valid production line name');
            return;
        }

        const newLine: ProductionLine = {
            id: productionLines.length + 1,
            lineName: lineName,
        };

        const updatedLines = [...productionLines, newLine];
        setProductionLines(updatedLines);
        setLineName(''); // Clear input after adding
        localStorage.setItem('productionLines', JSON.stringify(updatedLines)); // Save to localStorage immediately
    };

    const handleDeleteLine = (id: number) => {
        const updatedLines = productionLines.filter((line) => line.id !== id);
        setProductionLines(updatedLines);
        localStorage.setItem('productionLines', JSON.stringify(updatedLines)); // Save updated list to localStorage
    };

    return (
        <div className="production-lines-container">
            <div className="production-lines-card">
                <div className="card-header">
                    <h1>Production Lines</h1>
                    <button className="back-button" onClick={() => window.history.back()}>
                        Back to Admin
                    </button>
                </div>
                <div className="card-content">
                    <div className="add-line-section">
                        <input
                            type="text"
                            placeholder="Enter production line name"
                            value={lineName}
                            onChange={(e) => setLineName(e.target.value)}
                        />
                        <button className="add-button" onClick={handleAddLine}>
                            Add Line
                        </button>
                    </div>

                    <div className="lines-list">
                        <h2>Existing Production Lines</h2>
                        <ul>
                            {productionLines.length > 0 ? (
                                productionLines.map((line) => (
                                    <li key={line.id}>
                                        {line.lineName}{' '}
                                        <button
                                            className="delete-button"
                                            onClick={() => handleDeleteLine(line.id)}
                                        >
                                            Delete
                                        </button>
                                    </li>
                                ))
                            ) : (
                                <p>No production lines added yet.</p>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductionLines;