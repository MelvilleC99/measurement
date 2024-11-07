import React from 'react';

export interface LateListItemData {
    id: string;
    employeeNumber: string;
    name: string;
    surname: string;
    status: string;
}

interface LateListProps {
    items: LateListItemData[];
    onItemClick: (item: LateListItemData) => void;
    emptyMessage?: string;
}

const LateList: React.FC<LateListProps> = ({
                                               items,
                                               onItemClick,
                                               emptyMessage = "No items to display"
                                           }) => {
    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-4 bg-gray-50 border-b border-gray-200">
                <div className="px-4 py-3 text-sm font-semibold text-gray-700 text-center">Employee #</div>
                <div className="px-4 py-3 text-sm font-semibold text-gray-700 text-center">Name</div>
                <div className="px-4 py-3 text-sm font-semibold text-gray-700 text-center">Surname</div>
                <div className="px-4 py-3 text-sm font-semibold text-gray-700 text-center">Status</div>
            </div>

            {items.length === 0 ? (
                <div className="p-6 text-center text-gray-500">{emptyMessage}</div>
            ) : (
                <div className="max-h-[400px] overflow-y-auto">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => onItemClick(item)}
                            className="grid grid-cols-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                            <div className="px-4 py-3 text-sm text-gray-900 text-center">{item.employeeNumber}</div>
                            <div className="px-4 py-3 text-sm text-gray-900 text-center">{item.name}</div>
                            <div className="px-4 py-3 text-sm text-gray-900 text-center">{item.surname}</div>
                            <div className="px-4 py-3 text-sm text-gray-900 text-center">{item.status}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LateList;