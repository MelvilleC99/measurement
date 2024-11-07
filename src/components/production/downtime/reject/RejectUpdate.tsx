import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { RejectUpdateProps, RejectRecord } from '../types';
import StandardList, { ListItemData } from '../../../StandardDesign/list/StandardList';
import StandardCard from '../../../StandardDesign/card/StandardCard';
import './RejectUpdate.css';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    TextField,
    Button,
    Alert,
    IconButton,
    Select,
    MenuItem,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { SupportFunction } from '../../../../types';

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
    const [qcPassword, setQcPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
    const [actionType, setActionType] = useState<'perfect' | 'close' | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [qcs, setQcs] = useState<SupportFunction[]>([]);

    useEffect(() => {
        fetchRejects();
        fetchQCs();
    }, [sessionId]);

    const fetchRejects = async () => {
        try {
            setIsLoading(true);
            const rejectsSnapshot = await getDocs(
                query(
                    collection(db, 'rejects'),
                    where('sessionId', '==', sessionId),
                    where('status', '==', 'Open')
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

    const fetchQCs = async () => {
        try {
            const supportFunctionsRef = collection(db, 'supportFunctions');
            const q = query(
                supportFunctionsRef,
                where('role', '==', 'QC'),
                where('hasPassword', '==', true)
            );
            const querySnapshot = await getDocs(q);
            const qcsList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as SupportFunction));
            setQcs(qcsList);
        } catch (err) {
            console.error('Error in fetchQCs:', err);
            setError('Failed to fetch QCs');
        }
    };

    const formatRejectsForList = (rejects: RejectItem[]): ListItemData[] => {
        return rejects.map(reject => ({
            id: reject.id,
            title: `#${reject.refNumber}`,
            subtitle: reject.reason,
            status: reject.status,
            metadata: {
                styleNumber: reject.styleNumber,
                count: reject.count,
                operation: reject.operation
            }
        }));
    };

    const renderRejectItem = (item: ListItemData) => (
        <div className="list-row">
            <div className="ref-cell">{item.title}</div>
            <div className="style-cell">{item.metadata?.styleNumber}</div>
            <div className="reason-cell">{item.subtitle}</div>
            <div className="operation-cell">{item.metadata?.operation || '-'}</div>
            <div className="count-cell">{item.metadata?.count}</div>
        </div>
    );

    const handleListItemClick = (item: ListItemData) => {
        const reject = rejects.find(r => r.id === item.id);
        if (reject) {
            setSelectedReject(reject);
            setIsConfirmModalOpen(true);
            setError('');
        }
    };

    const handleAction = (type: 'perfect' | 'close') => {
        if (!selectedReject) {
            setError('No reject selected');
            return;
        }
        setActionType(type);
        setError('');
    };

    const verifyQC = async (): Promise<boolean> => {
        try {
            const qcSnapshot = await getDocs(
                query(
                    collection(db, 'supportFunctions'),
                    where('employeeNumber', '==', selectedReject?.qcId),
                    where('password', '==', qcPassword),
                    where('role', '==', 'QC'),
                    where('hasPassword', '==', true)
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
                updatedBy: selectedReject.qcId,
                comments: selectedReject.comments || `Marked as ${actionType}`,
                closedAt: Timestamp.now(),
                ...(actionType === 'perfect' ? {
                    fixedBy: selectedReject.qcId,
                    fixedAt: Timestamp.now()
                } : {})
            };

            await updateDoc(rejectRef, updateData);

            setSelectedReject(null);
            setQcPassword('');
            setIsConfirmModalOpen(false);
            setActionType(null);

            await fetchRejects();
            onUpdate && onUpdate();
        } catch (err) {
            console.error('Error updating reject:', err);
            setError('Failed to update reject');
        }
    };

    if (isLoading) {
        return (
            <div className="modal-overlay">
                <StandardCard title="Loading">
                    <div className="loading-state">Loading...</div>
                </StandardCard>
            </div>
        );
    }

    return (
        <div className="modal-overlay">
            <StandardCard
                title={selectedReject ? 'Reject Details' : 'Manage Rejects'}
                onClose={selectedReject ? () => setSelectedReject(null) : onClose}
            >
                {error && (
                    <div className="error-message">
                        <span>{error}</span>
                        <button onClick={() => setError('')}>×</button>
                    </div>
                )}

                {!selectedReject ? (
                    <StandardList
                        items={formatRejectsForList(rejects)}
                        onItemClick={handleListItemClick}
                        renderItemContent={renderRejectItem}
                        emptyMessage="No active rejects to display"
                    />
                ) : (
                    <Dialog
                        open={isConfirmModalOpen}
                        onClose={() => {
                            setIsConfirmModalOpen(false);
                            setSelectedReject(null);
                        }}
                        maxWidth="sm"
                        fullWidth
                        PaperProps={{ sx: { borderRadius: 2, p: 2 } }}
                    >
                        <DialogTitle sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            Reject Details
                            <IconButton onClick={() => {
                                setIsConfirmModalOpen(false);
                                setSelectedReject(null);
                            }} size="small">
                                <CloseIcon />
                            </IconButton>
                        </DialogTitle>

                        <DialogContent>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                                {error && <Alert severity="error">{error}</Alert>}

                                <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                                    <Typography variant="body2" color="text.secondary">Reference #</Typography>
                                    <Typography>{selectedReject.refNumber}</Typography>
                                    <Typography variant="body2" color="text.secondary">Style Number</Typography>
                                    <Typography>{selectedReject.styleNumber}</Typography>
                                    <Typography variant="body2" color="text.secondary">Reason</Typography>
                                    <Typography>{selectedReject.reason}</Typography>
                                    <Typography variant="body2" color="text.secondary">Count</Typography>
                                    <Typography>{selectedReject.count}</Typography>
                                    {selectedReject.operation && (
                                        <>
                                            <Typography variant="body2" color="text.secondary">Operation</Typography>
                                            <Typography>{selectedReject.operation}</Typography>
                                        </>
                                    )}
                                </Box>

                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                    <Button
                                        onClick={() => handleAction('perfect')}
                                        variant={actionType === 'perfect' ? "contained" : "outlined"}
                                        sx={{ minWidth: 150, textTransform: 'none' }}
                                    >
                                        Convert to Perfect
                                    </Button>
                                    <Button
                                        onClick={() => handleAction('close')}
                                        variant={actionType === 'close' ? "contained" : "outlined"}
                                        sx={{ minWidth: 150, textTransform: 'none' }}
                                    >
                                        Close Style
                                    </Button>
                                </Box>

                                <Select
                                    value={selectedReject?.qcId || ''}
                                    onChange={(e) => setSelectedReject({ ...selectedReject, qcId: e.target.value })}
                                    displayEmpty
                                    placeholder="Select QC"
                                    fullWidth
                                    sx={{
                                        borderRadius: 1,
                                        '& .MuiSelect-select': { py: 1.5 },
                                        boxShadow: '0 0 5px rgba(0,0,0,0.2)'
                                    }}
                                >
                                    <MenuItem value="" disabled>
                                        <Typography color="text.secondary">Select QC</Typography>
                                    </MenuItem>
                                    {qcs.map((qc) => (
                                        <MenuItem
                                            key={qc.id}
                                            value={qc.employeeNumber}
                                        >
                                            {`${qc.name} ${qc.surname}`}
                                        </MenuItem>
                                    ))}
                                </Select>

                                <TextField
                                    type="password"
                                    value={qcPassword}
                                    onChange={(e) => setQcPassword(e.target.value)}
                                    placeholder="Enter QC password"
                                    fullWidth
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 1,
                                            '& input': { py: 1.5, px: 1.5 }
                                        }
                                    }}
                                />

                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', pt: 2 }}>
                                    <Button
                                        onClick={handleConfirm}
                                        variant="contained"
                                        disabled={!selectedReject?.qcId || !qcPassword || !actionType}
                                        sx={{ minWidth: 100, textTransform: 'none' }}
                                    >
                                        Confirm
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setIsConfirmModalOpen(false);
                                            setSelectedReject(null);
                                        }}
                                        variant="outlined"
                                        sx={{ minWidth: 100, textTransform: 'none' }}
                                    >
                                        Cancel
                                    </Button>
                                </Box>
                            </Box>
                        </DialogContent>
                    </Dialog>
                )}
            </StandardCard>
        </div>
    );
};

export default RejectUpdate;