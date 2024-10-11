// src/components/Admin/ProductionLines.tsx

import React, { useState } from 'react';
import './ProductionLines.css';

interface ProductionLine {
    id: number;
    name: string;
}

const ProductionLines: React.FC = () => {
    const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
    const [newLineName, setNewLineName] = useState<string>('');

    const addProductionLine = () => {
        if (newLineName.trim() === '') {
            alert('Please provide a valid line name.');
            return;
        }

        const newLine: ProductionLine = {
            id: productionLines.length + 1,
            name: newLineName.trim(),
        };

        setProductionLines([...productionLines, newLine]);
        setNewLineName('');
    };

    const removeProductionLine = (id: number) => {
        setProductionLines(productionLines.filter((line) => line.id !== id));
    };

    return (
        <div className="production-lines-container">
            <div className="production-lines-card">
                <div className="card-header">
                    <button className="back-button" onClick={() => window.history.back()}>
                        Back to Admin
                    </button>
                    <h1>Production Lines</h1>
                </div>
                <div className="card-content">
                    <div className="input-group">
                        <input
                            type="text"
                            value={newLineName}
                            placeholder="Enter production line name"
                            onChange={(e) => setNewLineName(e.target.value)}
                        />
                        <button className="add-button" onClick={addProductionLine}>
                            Add Line
                        </button>
                    </div>
                    <div className="bounded-box">
                        <h2>Existing Production Lines</h2>
                        <ul className="lines-list">
                            {productionLines.map((line) => (
                                <li key={line.id}>
                                    {line.name}
                                    <button
                                        className="remove-button"
                                        onClick={() => removeProductionLine(line.id)}
                                    >
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductionLines;