// src/components/Admin/Overtime.tsx

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Button,
    Typography,
    Alert,
} from '@mui/material';
import { Style } from '../../../../types';
import { db } from '../../../../firebase';
import { collection, getDocs } from 'firebase/firestore';

interface OvertimeProps {
    onConfirm: (newTarget: number, selectedStyleId: string) => void;
    onCancel: () => void;
    currentStyleId: string;
}

const Overtime: React.FC<OvertimeProps> = ({ onConfirm, onCancel, currentStyleId }) => {
    const [newTarget, setNewTarget] = useState<number>(0);
    const [styles, setStyles] = useState<Style[]>([]);
    const [selectedStyleId, setSelectedStyleId] = useState<string>(currentStyleId);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const fetchStyles = async () => {
            try {
                const stylesSnapshot = await getDocs(collection(db, 'styles'));
                const stylesData = stylesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Style[];
                setStyles(stylesData);
            } catch (err) {
                console.error('Error fetching styles:', err);
                setError('Failed to load styles.');
            }
        };
        fetchStyles();
    }, []);

    const handleConfirm = () => {
        if (newTarget > 0 && selectedStyleId) {
            onConfirm(newTarget, selectedStyleId);
        } else {
            setError('Please enter a valid target and select a style.');
        }
    };

    return (
        <Dialog open onClose={onCancel} maxWidth="sm" fullWidth>
            <DialogTitle>Start Overtime</DialogTitle>
            <DialogContent>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <FormControl fullWidth margin="normal" variant="outlined">
                    <InputLabel id="style-select-label">Select Style</InputLabel>
                    <Select
                        labelId="style-select-label"
                        value={selectedStyleId}
                        onChange={(e) => setSelectedStyleId(e.target.value)}
                        label="Select Style"
                    >
                        <MenuItem value="">
                            <em>None</em>
                        </MenuItem>
                        {styles.map(style => (
                            <MenuItem key={style.id} value={style.id}>
                                {`${style.styleNumber} - ${style.styleName}`}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <TextField
                    label="Adjusted Target"
                    type="number"
                    value={newTarget}
                    onChange={(e) => setNewTarget(parseInt(e.target.value))}
                    fullWidth
                    margin="normal"
                    variant="outlined"
                    inputProps={{ min: 1 }}
                    placeholder="Enter new target units per hour"
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleConfirm} variant="contained" color="primary">
                    Confirm
                </Button>
                <Button onClick={onCancel} variant="outlined" color="secondary">
                    Cancel
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default Overtime;
