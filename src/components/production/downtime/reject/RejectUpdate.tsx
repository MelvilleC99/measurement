// RejectUpdate.tsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import './RejectUpdate.css';

interface RejectUpdateProps {
    onClose: () => void;
    onUpdate: () => void;
    sessionId: string;
    lineId: string;
    supervisorId: string;
}

interface RejectRecord {
    id: string;
    reason: string;
    operation: string;
    comments: string;
    count: number;
    status: 'open' | 'perfect' | 'closed';
    createdAt: Timestamp;
    updatedAt: Timestamp;
    qcId: string;
    sessionId: string;
    lineId: string;
}

interface RejectItem extends RejectRecord {
    refNumber?: string;
}

const RejectUpdate: React.FC<RejectUpdateProps> = ({
                                                       onClose,
                                                       onUpdate,
                                                       sessionId,
                                                       lineId,
                                                       supervisorId
                                                   }) => {
    const [rejects, setRejects] = useState<RejectItem[]>([]);
    const [selectedReject, setSelectedReject] = useState<RejectItem | null>(null);
    const [qcId, setQcId] = useState<string>('');
    const [qcPassword, setQcPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
    const [actionType, setActionType] = useState<'perfect' | 'close' | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [comments, setComments] = useState<string>('');

    useEffect(() => {
        fetchRejects();
    }, [sessionId]);

    const fetchRejects = async () => {
        try {
            setIsLoading(true);
            const rejectsSnapshot = await getDocs(
                query(
                    collection(db, 'rejects'),
                    where('sessionId', '==', sessionId),
                    where('status', '==', 'open')
                )
            );

            const fetchedRejects = rejectsSnapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id,
                refNumber: doc.id.slice(-4)
            })) as RejectItem[];

            setRejects(fetchedRejects);
        } catch (err) {
            console.error('Error fetching rejects:', err);
            setError('Failed to load rejects');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectReject = (reject: RejectItem) => {
        setSelectedReject(reject);
        setError('');
    };

    const handleAction = (type: 'perfect' | 'close') => {
        if (!selectedReject) {
            setError('No reject selected');
            return;
        }
        setActionType(type);
        setIsConfirmModalOpen(true);
        setError('');
    };

    const verifyQC = async (): Promise<boolean> => {
        try {
            const qcSnapshot = await getDocs(
                query(
                    collection(db, 'supportFunctions'),
                    where('employeeNumber', '==', qcId),
                    where('password', '==', qcPassword),
                    where('role', '==', 'QC')
                )
            );

            return !qcSnapshot.empty;
        } catch (err) {
            console.error('Error verifying QC:', err);
            return false;
        }
    };

    const handleConfirm = async () => {
        if (!selectedReject || !actionType) return;

        try {
            const isQCVerified = await verifyQC();
            if (!isQCVerified) {
                setError('Invalid QC credentials');
                return;
            }

            const rejectRef = doc(db, 'rejects', selectedReject.id);
            const updateData = {
                status: actionType === 'perfect' ? 'perfect' : 'closed',
                updatedAt: Timestamp.now(),
                updatedBy: qcId,
                comments: comments || `Marked as ${actionType}`,
                closedAt: Timestamp.now(),
                ...(actionType === 'perfect' ? {
                    fixedBy: qcId,
                    fixedAt: Timestamp.now()
                } : {})
            };

            await updateDoc(rejectRef, updateData);

            setSelectedReject(null);
            setQcId('');
            setQcPassword('');
            setComments('');
            setIsConfirmModalOpen(false);
            setActionType(null);

            await fetchRejects();
            onUpdate();
        } catch (err) {
            console.error('Error updating reject:', err);
            setError('Failed to update reject');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Manage Rejects</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                    >
                        ×
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-900 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                {isLoading ? (
                    <div className="flex justify-center items-center h-40">
                        <span className="text-gray-500">Loading...</span>
                    </div>
                ) : (
                    <>
                        {!selectedReject ? (
                            <div className="space-y-4">
                                {rejects.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        No active rejects to display.
                                    </div>
                                ) : (
                                    rejects.map(reject => (
                                        <div
                                            key={reject.id}
                                            onClick={() => handleSelectReject(reject)}
                                            className="cursor-pointer border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className={`px-2 py-1 rounded-full text-sm ${
                                                        reject.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                                                            reject.status === 'perfect' ? 'bg-green-100 text-green-800' :
                                                                'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {reject.status}
                                                    </span>
                                                    <p className="mt-2 font-medium">
                                                        Ref: {reject.refNumber}
                                                    </p>
                                                </div>
                                                <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                                                    Count: {reject.count}
                                                </span>
                                            </div>
                                            <p className="mt-2"><span className="font-medium">Reason:</span> {reject.reason}</p>
                                            {reject.operation && (
                                                <p className="mt-1"><span className="font-medium">Operation:</span> {reject.operation}</p>
                                            )}
                                            {reject.comments && (
                                                <p className="mt-1"><span className="font-medium">Comments:</span> {reject.comments}</p>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="border rounded-lg p-4">
                                    <h3 className="font-medium">Selected Reject Details</h3>
                                    <p>Ref: {selectedReject.refNumber}</p>
                                    <p>Reason: {selectedReject.reason}</p>
                                    <p>Count: {selectedReject.count}</p>
                                    {selectedReject.operation && <p>Operation: {selectedReject.operation}</p>}
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => handleAction('perfect')}
                                        className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                    >
                                        Mark as Perfect
                                    </button>
                                    <button
                                        onClick={() => handleAction('close')}
                                        className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                                    >
                                        Close (End of Style)
                                    </button>
                                </div>

                                <button
                                    onClick={() => setSelectedReject(null)}
                                    className="w-full text-gray-600 hover:text-gray-800 py-2"
                                >
                                    Back to List
                                </button>
                            </div>
                        )}

                        {isConfirmModalOpen && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                <div className="bg-white rounded-lg p-6 max-w-md w-full">
                                    <h3 className="text-lg font-medium mb-4">
                                        Confirm {actionType === 'perfect' ? 'Perfect' : 'Close'}
                                    </h3>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">
                                                QC ID
                                            </label>
                                            <input
                                                type="text"
                                                value={qcId}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQcId(e.target.value)}
                                                placeholder="Enter QC ID"
                                                className="w-full px-3 py-2 border rounded"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1">
                                                QC Password
                                            </label>
                                            <input
                                                type="password"
                                                value={qcPassword}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQcPassword(e.target.value)}
                                                placeholder="Enter QC password"
                                                className="w-full px-3 py-2 border rounded"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1">
                                                Comments
                                            </label>
                                            <textarea
                                                value={comments}
                                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComments(e.target.value)}
                                                placeholder="Enter comments (optional)"
                                                className="w-full px-3 py-2 border rounded"
                                            />
                                        </div>

                                        <div className="flex gap-4">
                                            <button
                                                onClick={handleConfirm}
                                                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                            >
                                                Confirm
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsConfirmModalOpen(false);
                                                    setQcId('');
                                                    setQcPassword('');
                                                    setComments('');
                                                }}
                                                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default RejectUpdate;