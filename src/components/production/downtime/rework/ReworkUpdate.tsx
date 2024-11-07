import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { ReworkRecord, ReworkUpdateProps } from '../types';
import { RejectFormData } from '../types';
import StandardList, { ListItemData } from '../../../StandardDesign/list/StandardList';
import StandardCard from '../../../StandardDesign/card/StandardCard';
import './ReworkUpdate.css';
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

const ReworkUpdate: React.FC<ReworkUpdateProps> = ({
                                                       onClose,
                                                       onUpdate,
                                                       lineId,
                                                       supervisorId,
                                                       sessionId
                                                   }) => {
    const [reworks, setReworks] = useState<ReworkRecord[]>([]);
    const [selectedRework, setSelectedRework] = useState<ReworkRecord | null>(null);
    const [qcPassword, setQcPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
    const [actionType, setActionType] = useState<'perfect' | 'reject' | null>(null);
    const [qcs, setQcs] = useState<SupportFunction[]>([]);

    useEffect(() => {
        fetchReworks();
        fetchQCs();
    }, [sessionId]);

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

    const fetchReworks = async () => {
        try {
            setIsLoading(true);
            const reworksQuery = query(
                collection(db, 'reworks'),
                where('sessionId', '==', sessionId),
                where('status', '==', 'Open')
            );

            const snapshot = await getDocs(reworksQuery);
            const fetchedReworks = snapshot.docs.map(doc => {
                const data = doc.data();
                const reworkRef = doc.id.slice(-4);
                return {
                    id: doc.id,
                    itemId: reworkRef,
                    count: data.count || 0,
                    reason: data.reason || '',
                    operation: data.operation || '',
                    qcId: data.qcId || '',
                    productionLineId: data.productionLineId || '',
                    supervisorId: data.supervisorId || '',
                    sessionId: data.sessionId || '',
                    styleNumber: data.styleNumber || '',
                    status: data.status || 'open',
                    comments: data.comments || '',
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                    refNumber: reworkRef
                } as ReworkRecord;
            });

            setReworks(fetchedReworks);
        } catch (err) {
            console.error('Error fetching reworks:', err);
            setError('Failed to load reworks');
        } finally {
            setIsLoading(false);
        }
    };

    const formatReworksForList = (reworks: ReworkRecord[]): ListItemData[] => {
        return reworks.map(rework => ({
            id: rework.id,
            title: `#${rework.itemId}`,
            subtitle: rework.reason,
            status: rework.status,
            metadata: {
                styleNumber: rework.styleNumber,
                count: rework.count,
                operation: rework.operation
            }
        }));
    };

    const renderReworkItem = (item: ListItemData) => (
        <div className="list-row">
            <div className="ref-cell">{item.title}</div>
            <div className="style-cell">{item.metadata?.styleNumber}</div>
            <div className="reason-cell">{item.subtitle}</div>
            <div className="operation-cell">{item.metadata?.operation || '-'}</div>
            <div className="count-cell">{item.metadata?.count}</div>
        </div>
    );

    const handleListItemClick = (item: ListItemData) => {
        const rework = reworks.find(r => r.id === item.id);
        if (rework) {
            setSelectedRework(rework);
            setIsConfirmModalOpen(true);
            setError('');
        }
    };

    const handleAction = (type: 'perfect' | 'reject') => {
        if (!selectedRework) {
            setError('No rework selected');
            return;
        }
        setActionType(type);
        setError('');
    };

    const verifyQC = async (): Promise<boolean> => {
        try {
            const qcSnapshot = await getDocs(query(
                collection(db, 'supportFunctions'),
                where('employeeNumber', '==', selectedRework?.qcId),
                where('password', '==', qcPassword),
                where('role', '==', 'QC'),
                where('hasPassword', '==', true)
            ));

            return !qcSnapshot.empty;
        } catch (err) {
            console.error('Error verifying QC:', err);
            return false;
        }
    };

    const handleConfirm = async () => {
        if (!selectedRework || !actionType) return;

        try {
            const isQCVerified = await verifyQC();
            if (!isQCVerified) {
                setError('Invalid QC credentials');
                return;
            }

            const timestamp = serverTimestamp();

            if (actionType === 'perfect') {
                await updateDoc(doc(db, 'reworks', selectedRework.id), {
                    status: 'perfect',
                    closedAt: timestamp,
                    closedBy: selectedRework.qcId,
                    updatedAt: timestamp
                });
            } else {
                const rejectData: RejectFormData = {
                    reason: selectedRework.reason,
                    operation: selectedRework.operation,
                    comments: `Converted from Rework #${selectedRework.itemId}. ${selectedRework.comments}`,
                    qcId: selectedRework.qcId,
                    count: selectedRework.count,
                    recordedAsProduced: false,
                    productionLineId: selectedRework.productionLineId,
                    supervisorId: selectedRework.supervisorId,
                    sessionId: selectedRework.sessionId,
                    styleNumber: selectedRework.styleNumber,
                    status: 'open'
                };

                await Promise.all([
                    addDoc(collection(db, 'rejects'), {
                        ...rejectData,
                        createdAt: timestamp,
                        updatedAt: timestamp
                    }),
                    updateDoc(doc(db, 'reworks', selectedRework.id), {
                        status: 'rejected',
                        closedAt: timestamp,
                        closedBy: selectedRework.qcId,
                        updatedAt: timestamp
                    })
                ]);
            }

            await fetchReworks();
            if (onUpdate) {
                onUpdate();
            }

            setSelectedRework(null);
            setQcPassword('');
            setIsConfirmModalOpen(false);
            setActionType(null);
            setError('');
        } catch (err) {
            console.error('Error updating rework:', err);
            setError('Failed to update rework');
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
                title={selectedRework ? 'Rework Details' : 'Manage Reworks'}
                onClose={selectedRework ? () => setSelectedRework(null) : onClose}
            >
                {error && (
                    <div className="error-message">
                        <span>{error}</span>
                        <button onClick={() => setError('')}>×</button>
                    </div>
                )}

                {!selectedRework ? (
                    <StandardList
                        items={formatReworksForList(reworks)}
                        onItemClick={handleListItemClick}
                        renderItemContent={renderReworkItem}
                        emptyMessage="No active reworks to display"
                    />
                ) : (
                    <Dialog
                        open={isConfirmModalOpen}
                        onClose={() => {
                            setIsConfirmModalOpen(false);
                            setSelectedRework(null);
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
                            Rework Details
                            <IconButton onClick={() => {
                                setIsConfirmModalOpen(false);
                                setSelectedRework(null);
                            }} size="small">
                                <CloseIcon />
                            </IconButton>
                        </DialogTitle>

                        <DialogContent>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                                {error && <Alert severity="error">{error}</Alert>}

                                <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                                    <Typography variant="body2" color="text.secondary">Reference #</Typography>
                                    <Typography>{selectedRework.itemId}</Typography>
                                    <Typography variant="body2" color="text.secondary">Style Number</Typography>
                                    <Typography>{selectedRework.styleNumber}</Typography>
                                    <Typography variant="body2" color="text.secondary">Reason</Typography>
                                    <Typography>{selectedRework.reason}</Typography>
                                    <Typography variant="body2" color="text.secondary">Count</Typography>
                                    <Typography>{selectedRework.count}</Typography>
                                    {selectedRework.operation && (
                                        <>
                                            <Typography variant="body2" color="text.secondary">Operation</Typography>
                                            <Typography>{selectedRework.operation}</Typography>
                                        </>
                                    )}
                                </Box>

                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                    <Button
                                        onClick={() => handleAction('perfect')}
                                        variant={actionType === 'perfect' ? "contained" : "outlined"}
                                        sx={{ minWidth: 150, textTransform: 'none' }}
                                    >
                                        Mark as Perfect
                                    </Button>
                                    <Button
                                        onClick={() => handleAction('reject')}
                                        variant={actionType === 'reject' ? "contained" : "outlined"}
                                        sx={{ minWidth: 150, textTransform: 'none' }}
                                    >
                                        Convert to Reject
                                    </Button>
                                </Box>

                                <Select
                                    value={selectedRework?.qcId || ''}
                                    onChange={(e) => setSelectedRework({ ...selectedRework, qcId: e.target.value })}
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
                                        disabled={!selectedRework?.qcId || !qcPassword || !actionType}
                                        sx={{ minWidth: 100, textTransform: 'none' }}
                                    >
                                        Confirm
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setIsConfirmModalOpen(false);
                                            setSelectedRework(null);
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

export default ReworkUpdate;