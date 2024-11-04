import React from 'react';
import { Paper } from '@mui/material';
import './StandardList.css';

export interface ListItemData {
    id: string;
    title: string;
    subtitle?: string;
    status?: string;
    metadata?: {
        [key: string]: string | number;
    };
    type?: 'production' | 'employee';
}

interface StandardListProps {
    title?: string;
    items: ListItemData[];
    onItemClick: (item: ListItemData) => void;
    renderItemContent: (item: ListItemData) => React.ReactNode;
    emptyMessage?: string;
    type?: 'production' | 'employee';
}

const StandardList: React.FC<StandardListProps> = ({
                                                       items,
                                                       onItemClick,
                                                       renderItemContent,
                                                       emptyMessage = "No items to display",
                                                       type = 'production'
                                                   }) => {
    const getHeaders = () => {
        return type === 'production' ? (
            <>
                <div className="header-cell">Ref #</div>
                <div className="header-cell">Style</div>
                <div className="header-cell">Reason</div>
                <div className="header-cell">Operation</div>
                <div className="header-cell">Count</div>
            </>
        ) : (
            <>
                <div className="header-cell">Name</div>
                <div className="header-cell">Surname</div>
                <div className="header-cell">Employee #</div>
                <div className="header-cell">Status</div>
            </>
        );
    };

    return (
        <div className="standard-list-container">
            <div className="list-header">
                {getHeaders()}
            </div>

            {items.length === 0 ? (
                <div className="empty-message">{emptyMessage}</div>
            ) : (
                <div className="list-content">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => onItemClick(item)}
                            className="list-item-wrapper"
                        >
                            {renderItemContent(item)}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StandardList;