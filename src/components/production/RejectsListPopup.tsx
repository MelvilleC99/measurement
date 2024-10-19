import React from 'react';
import './RejectsListPopup.css';

interface Reject {
    docId: string; // Firestore document ID
    count: number;
    reason: string;
    recordedAsProduced: boolean;
    qcApprovedBy: string;
}

interface RejectsListPopupProps {
    rejects: Reject[];
    onClose: () => void;
}

const RejectsListPopup: React.FC<RejectsListPopupProps> = ({
                                                               rejects,
                                                               onClose,
                                                           }) => {
    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>List of Rejects</h2>
                <div className="rejects-list">
                    {rejects.map((reject) => (
                        <div key={reject.docId} className="reject-item">
                            <p><strong>Ref:</strong> {reject.docId.slice(-4)}</p> {/* Displaying last 4 digits */}
                            <p><strong>Count:</strong> {reject.count}</p>
                            <p><strong>Reason:</strong> {reject.reason}</p>
                            <p><strong>Recorded as Produced:</strong> {reject.recordedAsProduced ? 'Yes' : 'No'}</p>
                            <p><strong>QC Approved By:</strong> {reject.qcApprovedBy}</p>
                        </div>
                    ))}
                </div>
                <button className="close-button" onClick={onClose}>Close</button>
            </div>
        </div>
    );
};

export default RejectsListPopup;
