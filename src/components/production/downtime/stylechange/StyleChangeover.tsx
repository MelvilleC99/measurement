import React, { useState, useEffect } from 'react';
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
    InputLabel,
    FormControl
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { collection, addDoc, getDoc, getDocs, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';

interface StyleChangeoverProps {
    onClose: () => void;
    onSubmit: (data: StyleChangeoverFormData) => Promise<void>;
    productionLineId: string;
    supervisorId: string;
}

interface StyleChangeoverFormData {
    currentStyle: string;
    nextStyle: string;
    target: string;
    productionLineId: string;
    supervisorId: string;
}

interface StyleItem {
    id: string;
    styleNumber: string;
}

const StyleChangeover: React.FC<StyleChangeoverProps> = ({
                                                             onClose,
                                                             onSubmit,
                                                             productionLineId,
                                                             supervisorId,
                                                         }) => {
    const [currentStyle, setCurrentStyle] = useState<string>('Unknown');
    const [nextStyle, setNextStyle] = useState<string>('');
    const [target, setTarget] = useState<string>('');
    const [stylesList, setStylesList] = useState<StyleItem[]>([]);
    const [error, setError] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchCurrentStyle = async () => {
            try {
                const lineDoc = await getDoc(doc(db, 'productionLines', productionLineId));
                setCurrentStyle(lineDoc.data()?.currentStyle || 'Unknown');
            } catch (error) {
                console.error('Error fetching current style:', error);
                setError('Failed to load current style.');
            }
        };

        const fetchStyles = async () => {
            try {
                const stylesSnapshot = await getDocs(collection(db, 'styles'));
                const stylesData = stylesSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    styleNumber: doc.data().styleNumber,
                }));
                setStylesList(stylesData);
            } catch (error) {
                console.error('Error fetching styles:', error);
                setError('Failed to load styles.');
            }
        };

        fetchCurrentStyle();
        fetchStyles();
    }, [productionLineId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        if (!nextStyle || !target) {
            setError('Please fill in all required fields.');
            setIsSubmitting(false);
            return;
        }

        const styleChangeoverData: StyleChangeoverFormData = {
            currentStyle,
            nextStyle,
            target,
            productionLineId,
            supervisorId,
        };

        try {
            await onSubmit(styleChangeoverData);
            onClose();
        } catch (err) {
            console.error('Error initiating style changeover:', err);
            setError('Failed to initiate style changeover.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog
            open={true}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    overflow: 'hidden' // Contains all content
                }
            }}
        >
            <DialogTitle sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 2,
                borderBottom: '1px solid',
                borderColor: 'divider'
            }}>
                Style Changeover
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 2 }}>
                <form onSubmit={handleSubmit}>
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2.5
                    }}>
                        {error && (
                            <Alert
                                severity="error"
                                sx={{
                                    borderRadius: 1,
                                    '& .MuiAlert-message': {
                                        width: '100%'
                                    }
                                }}
                            >
                                {error}
                            </Alert>
                        )}

                        {/* Current Style Display */}
                        <Box sx={{
                            bgcolor: 'grey.50',
                            p: 2,
                            borderRadius: 1,
                            width: '100%'
                        }}>
                            <Typography color="text.secondary" variant="body2" gutterBottom>
                                Current Style
                            </Typography>
                            <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
                                {currentStyle}
                            </Typography>
                        </Box>

                        {/* Next Style Selection */}
                        <FormControl fullWidth>
                            <InputLabel>Next Style</InputLabel>
                            <Select
                                value={nextStyle}
                                onChange={(e) => setNextStyle(e.target.value)}
                                label="Next Style"
                                required
                                sx={{
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderRadius: 1
                                    },
                                    '& .MuiSelect-select': {
                                        py: 1.5
                                    }
                                }}
                            >
                                <MenuItem value="" disabled>
                                    Select next style
                                </MenuItem>
                                {stylesList.map((style) => (
                                    <MenuItem
                                        key={style.id}
                                        value={style.styleNumber}
                                        sx={{
                                            whiteSpace: 'normal',
                                            wordBreak: 'break-word'
                                        }}
                                    >
                                        {style.styleNumber}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Target Input */}
                        <TextField
                            label="Target"
                            type="number"
                            value={target}
                            onChange={(e) => setTarget(e.target.value)}
                            required
                            fullWidth
                            InputProps={{
                                sx: {
                                    '& input': { py: 1.5 }
                                }
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 1
                                }
                            }}
                        />

                        {/* Action Buttons */}
                        <Box sx={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 1,
                            pt: 1
                        }}>
                            <Button
                                onClick={onClose}
                                variant="outlined"
                                sx={{
                                    minWidth: 100,
                                    textTransform: 'none',
                                    borderRadius: 1
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={isSubmitting}
                                sx={{
                                    minWidth: 100,
                                    textTransform: 'none',
                                    borderRadius: 1
                                }}
                            >
                                {isSubmitting ? "Submitting..." : "Confirm"}
                            </Button>
                        </Box>
                    </Box>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default StyleChangeover;