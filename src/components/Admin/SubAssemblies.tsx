import React, { useState, useEffect, ChangeEvent } from 'react';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    Timestamp,
    arrayRemove,
    onSnapshot,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { SubAssembly, Process } from '../../types';

// Importing Material-UI components
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    IconButton,
    Typography,
    Checkbox,
    FormControlLabel,
    FormGroup,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Alert,
    Box,
} from '@mui/material';
import { Add, Edit, Delete, Visibility, Close } from '@mui/icons-material';

// Importing Tailwind CSS
import 'tailwindcss/tailwind.css';

const SubAssemblies: React.FC = () => {
    // State variables
    const [subAssemblies, setSubAssemblies] = useState<SubAssembly[]>([]);
    const [processes, setProcesses] = useState<Process[]>([]);

    // Error states
    const [subAsmError, setSubAsmError] = useState<string>('');
    const [processError, setProcessError] = useState<string>('');

    // Form states for Sub-Assemblies
    const [currentSubAsm, setCurrentSubAsm] = useState<SubAssembly | null>(null);
    const [subAsmName, setSubAsmName] = useState('');
    const [subAsmDescription, setSubAsmDescription] = useState('');

    // Form states for Processes
    const [currentProcess, setCurrentProcess] = useState<Process | null>(null);
    const [processName, setProcessName] = useState('');
    const [processDescription, setProcessDescription] = useState('');
    const [selectedSubAsmIds, setSelectedSubAsmIds] = useState<string[]>([]);

    // View state
    const [viewItem, setViewItem] = useState<{
        type: 'process' | 'subAssembly';
        item: Process | SubAssembly;
    } | null>(null);

    // Dialog Open States
    const [isAddProcessOpen, setIsAddProcessOpen] = useState(false);
    const [isAddSubAsmOpen, setIsAddSubAsmOpen] = useState(false);
    const [isEditProcessOpen, setIsEditProcessOpen] = useState(false);
    const [isEditSubAsmOpen, setIsEditSubAsmOpen] = useState(false);

    // Fetch Sub-Assemblies and Processes in real-time
    useEffect(() => {
        const unsubSubAsm = onSnapshot(
            collection(db, 'subAssemblies'),
            (snapshot) => {
                const list = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...(doc.data() as Omit<SubAssembly, 'id'>),
                }));
                setSubAssemblies(list);
            },
            (error) => {
                console.error('Error fetching Sub-Assemblies:', error);
                setSubAsmError('Failed to load Sub-Assemblies.');
            }
        );

        const unsubProcesses = onSnapshot(
            collection(db, 'processes'),
            (snapshot) => {
                const list = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...(doc.data() as Omit<Process, 'id'>),
                }));
                // Sort processes by sequence
                list.sort((a, b) => a.sequence - b.sequence);
                setProcesses(list);
            },
            (error) => {
                console.error('Error fetching Processes:', error);
                setProcessError('Failed to load Processes.');
            }
        );

        return () => {
            unsubSubAsm();
            unsubProcesses();
        };
    }, []);

    // Handle Add Sub-Assembly
    const handleAddSubAssembly = async () => {
        if (!subAsmName.trim()) {
            setSubAsmError('Sub-Assembly name is required.');
            return;
        }

        try {
            await addDoc(collection(db, 'subAssemblies'), {
                name: subAsmName.trim(),
                description: subAsmDescription?.trim() || '',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
            setSubAsmName('');
            setSubAsmDescription('');
            setSubAsmError('');
            setIsAddSubAsmOpen(false);
        } catch (err) {
            console.error('Error adding Sub-Assembly:', err);
            setSubAsmError('Failed to add Sub-Assembly.');
        }
    };

    // Handle Edit Sub-Assembly
    const handleEditSubAssembly = async () => {
        if (!currentSubAsm) return;
        if (!subAsmName.trim()) {
            setSubAsmError('Sub-Assembly name is required.');
            return;
        }

        try {
            const subAsmDoc = doc(db, 'subAssemblies', currentSubAsm.id);
            await updateDoc(subAsmDoc, {
                name: subAsmName.trim(),
                description: subAsmDescription?.trim() || '',
                updatedAt: Timestamp.now(),
            });
            setCurrentSubAsm(null);
            setSubAsmName('');
            setSubAsmDescription('');
            setIsEditSubAsmOpen(false);
            setSubAsmError('');
        } catch (err) {
            console.error('Error editing Sub-Assembly:', err);
            setSubAsmError('Failed to edit Sub-Assembly.');
        }
    };

    // Handle Delete Sub-Assembly
    const handleDeleteSubAssembly = async (subAsmId: string) => {
        const confirmed = window.confirm(
            'Are you sure you want to delete this Sub-Assembly? It will be unlinked from all Processes.'
        );
        if (!confirmed) return;

        try {
            // Unlink from all Processes
            const linkedProcesses = processes.filter((process) =>
                process.subAssemblyIds.includes(subAsmId)
            );
            for (const process of linkedProcesses) {
                const processDoc = doc(db, 'processes', process.id);
                await updateDoc(processDoc, {
                    subAssemblyIds: arrayRemove(subAsmId),
                });
            }

            // Delete Sub-Assembly
            const subAsmDoc = doc(db, 'subAssemblies', subAsmId);
            await deleteDoc(subAsmDoc);
            setSubAsmError('');
        } catch (err) {
            console.error('Error deleting Sub-Assembly:', err);
            setSubAsmError('Failed to delete Sub-Assembly.');
        }
    };

    // Handle Add Process
    const handleAddProcess = async () => {
        if (!processName.trim()) {
            setProcessError('Process name is required.');
            return;
        }

        try {
            const nextSequence = processes.length > 0 ? processes[processes.length - 1].sequence + 1 : 1;
            await addDoc(collection(db, 'processes'), {
                name: processName.trim(),
                description: processDescription?.trim() || '',
                sequence: nextSequence,
                subAssemblyIds: [],
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
            setProcessName('');
            setProcessDescription('');
            setProcessError('');
            setIsAddProcessOpen(false);
        } catch (err) {
            console.error('Error adding Process:', err);
            setProcessError('Failed to add Process.');
        }
    };

    // Handle Edit Process
    const handleEditProcess = async () => {
        if (!currentProcess) return;
        if (!processName.trim()) {
            setProcessError('Process name is required.');
            return;
        }

        try {
            const processDoc = doc(db, 'processes', currentProcess.id);
            await updateDoc(processDoc, {
                name: processName.trim(),
                description: processDescription?.trim() || '',
                subAssemblyIds: selectedSubAsmIds,
                updatedAt: Timestamp.now(),
            });
            setCurrentProcess(null);
            setProcessName('');
            setProcessDescription('');
            setSelectedSubAsmIds([]);
            setIsEditProcessOpen(false);
            setProcessError('');
        } catch (err) {
            console.error('Error editing Process:', err);
            setProcessError('Failed to edit Process.');
        }
    };

    // Handle Delete Process
    const handleDeleteProcess = async (processId: string) => {
        const confirmed = window.confirm('Are you sure you want to delete this Process?');
        if (!confirmed) return;

        try {
            const processDoc = doc(db, 'processes', processId);
            await deleteDoc(processDoc);
            setProcessError('');
        } catch (err) {
            console.error('Error deleting Process:', err);
            setProcessError('Failed to delete Process.');
        }
    };

    // Handle linking Sub-Assemblies to Process
    const toggleSubAsmSelection = (subAsmId: string) => {
        if (selectedSubAsmIds.includes(subAsmId)) {
            setSelectedSubAsmIds(selectedSubAsmIds.filter((id) => id !== subAsmId));
        } else {
            setSelectedSubAsmIds([...selectedSubAsmIds, subAsmId]);
        }
    };

    // Function to handle viewing a process or sub-assembly
    const handleView = (type: 'process' | 'subAssembly', item: Process | SubAssembly) => {
        setViewItem({ type, item });
    };

    return (
        <div className="p-8 space-y-12 bg-white min-h-screen">
            {/* Header */}
            <div className="mb-8 bg-emerald-700 p-4 rounded">
                <h1 className="text-3xl font-bold text-white">Processes & Sub-Assemblies Management</h1>
                <p className="text-md text-white">
                    Create standardized Sub-Assemblies and link them to multiple Processes.
                </p>
            </div>

            {/* Processes List */}
            <div>
                <h2 className="text-2xl font-semibold mb-4 text-black">Processes</h2>

                {/* Add Process Button */}
                <div className="mb-4">
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Add />}
                        onClick={() => setIsAddProcessOpen(true)}
                    >
                        Add Process
                    </Button>
                </div>

                {processError && (
                    <Alert severity="error" className="mb-4">
                        {processError}
                    </Alert>
                )}

                <Paper>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow style={{ backgroundColor: '#059669' }}>
                                    <TableCell style={{ color: 'white' }}>Name</TableCell>
                                    <TableCell style={{ color: 'white' }}>Description</TableCell>
                                    <TableCell style={{ color: 'white' }}>Sub-Assemblies</TableCell>
                                    <TableCell style={{ color: 'white' }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {processes.map((process) => (
                                    <TableRow key={process.id}>
                                        <TableCell>{process.name}</TableCell>
                                        <TableCell>{process.description}</TableCell>
                                        <TableCell>
                                            {process.subAssemblyIds.length === 0 ? (
                                                <span className="text-gray-400">No Sub-Assemblies</span>
                                            ) : (
                                                <ul className="list-disc list-inside">
                                                    {process.subAssemblyIds.map((subAsmId) => {
                                                        const subAsm = subAssemblies.find((sa) => sa.id === subAsmId);
                                                        return subAsm ? <li key={subAsm.id}>{subAsm.name}</li> : null;
                                                    })}
                                                </ul>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <IconButton
                                                color="primary"
                                                onClick={() => handleView('process', process)}
                                            >
                                                <Visibility />
                                            </IconButton>
                                            <IconButton
                                                color="secondary"
                                                onClick={() => {
                                                    setIsEditProcessOpen(true);
                                                    setCurrentProcess(process);
                                                    setProcessName(process.name);
                                                    setProcessDescription(process.description || '');
                                                    setSelectedSubAsmIds(process.subAssemblyIds || []);
                                                }}
                                            >
                                                <Edit />
                                            </IconButton>
                                            <IconButton
                                                color="error"
                                                onClick={() => handleDeleteProcess(process.id)}
                                            >
                                                <Delete />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </div>

            {/* Sub-Assemblies List */}
            <div>
                <h2 className="text-2xl font-semibold mb-4 text-black">Sub-Assemblies</h2>

                {/* Add Sub-Assembly Button */}
                <div className="mb-4">
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Add />}
                        onClick={() => setIsAddSubAsmOpen(true)}
                    >
                        Add Sub-Assembly
                    </Button>
                </div>

                {subAsmError && (
                    <Alert severity="error" className="mb-4">
                        {subAsmError}
                    </Alert>
                )}

                <Paper>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow style={{ backgroundColor: '#059669' }}>
                                    <TableCell style={{ color: 'white' }}>Name</TableCell>
                                    <TableCell style={{ color: 'white' }}>Description</TableCell>
                                    <TableCell style={{ color: 'white' }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {subAssemblies.map((subAsm) => (
                                    <TableRow key={subAsm.id}>
                                        <TableCell>{subAsm.name}</TableCell>
                                        <TableCell>{subAsm.description}</TableCell>
                                        <TableCell>
                                            <IconButton
                                                color="primary"
                                                onClick={() => handleView('subAssembly', subAsm)}
                                            >
                                                <Visibility />
                                            </IconButton>
                                            <IconButton
                                                color="secondary"
                                                onClick={() => {
                                                    setIsEditSubAsmOpen(true);
                                                    setCurrentSubAsm(subAsm);
                                                    setSubAsmName(subAsm.name);
                                                    setSubAsmDescription(subAsm.description || '');
                                                }}
                                            >
                                                <Edit />
                                            </IconButton>
                                            <IconButton
                                                color="error"
                                                onClick={() => handleDeleteSubAssembly(subAsm.id)}
                                            >
                                                <Delete />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </div>

            {/* Add Process Dialog */}
            <Dialog open={isAddProcessOpen} onClose={() => setIsAddProcessOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>
                    Add New Process
                    <IconButton
                        aria-label="close"
                        onClick={() => setIsAddProcessOpen(false)}
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                    >
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    {processError && <Alert severity="error">{processError}</Alert>}
                    <TextField
                        label="Process Name"
                        value={processName}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setProcessName(e.target.value)}
                        fullWidth
                        required
                        margin="normal"
                    />
                    <TextField
                        label="Description"
                        value={processDescription}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setProcessDescription(e.target.value)}
                        fullWidth
                        multiline
                        rows={4}
                        margin="normal"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleAddProcess} variant="contained" color="primary">
                        Add Process
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Process Dialog */}
            <Dialog open={isEditProcessOpen} onClose={() => setIsEditProcessOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>
                    Edit Process
                    <IconButton
                        aria-label="close"
                        onClick={() => setIsEditProcessOpen(false)}
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                    >
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    {processError && <Alert severity="error">{processError}</Alert>}
                    <TextField
                        label="Process Name"
                        value={processName}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setProcessName(e.target.value)}
                        fullWidth
                        required
                        margin="normal"
                    />
                    <TextField
                        label="Description"
                        value={processDescription}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setProcessDescription(e.target.value)}
                        fullWidth
                        multiline
                        rows={4}
                        margin="normal"
                    />
                    <Typography variant="h6" sx={{ mt: 2 }}>
                        Link Sub-Assemblies
                    </Typography>
                    <FormGroup>
                        {subAssemblies.map((subAsm) => (
                            <FormControlLabel
                                key={subAsm.id}
                                control={
                                    <Checkbox
                                        checked={selectedSubAsmIds.includes(subAsm.id)}
                                        onChange={() => toggleSubAsmSelection(subAsm.id)}
                                        color="primary"
                                    />
                                }
                                label={subAsm.name}
                            />
                        ))}
                    </FormGroup>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleEditProcess} variant="contained" color="primary">
                        Save Changes
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Add Sub-Assembly Dialog */}
            <Dialog open={isAddSubAsmOpen} onClose={() => setIsAddSubAsmOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>
                    Add New Sub-Assembly
                    <IconButton
                        aria-label="close"
                        onClick={() => setIsAddSubAsmOpen(false)}
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                    >
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    {subAsmError && <Alert severity="error">{subAsmError}</Alert>}
                    <TextField
                        label="Sub-Assembly Name"
                        value={subAsmName}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setSubAsmName(e.target.value)}
                        fullWidth
                        required
                        margin="normal"
                    />
                    <TextField
                        label="Description"
                        value={subAsmDescription}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setSubAsmDescription(e.target.value)}
                        fullWidth
                        multiline
                        rows={4}
                        margin="normal"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleAddSubAssembly} variant="contained" color="primary">
                        Add Sub-Assembly
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Sub-Assembly Dialog */}
            <Dialog open={isEditSubAsmOpen} onClose={() => setIsEditSubAsmOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>
                    Edit Sub-Assembly
                    <IconButton
                        aria-label="close"
                        onClick={() => setIsEditSubAsmOpen(false)}
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                    >
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    {subAsmError && <Alert severity="error">{subAsmError}</Alert>}
                    <TextField
                        label="Sub-Assembly Name"
                        value={subAsmName}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setSubAsmName(e.target.value)}
                        fullWidth
                        required
                        margin="normal"
                    />
                    <TextField
                        label="Description"
                        value={subAsmDescription}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setSubAsmDescription(e.target.value)}
                        fullWidth
                        multiline
                        rows={4}
                        margin="normal"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleEditSubAssembly} variant="contained" color="primary">
                        Save Changes
                    </Button>
                </DialogActions>
            </Dialog>

            {/* View Dialog */}
            <Dialog open={!!viewItem} onClose={() => setViewItem(null)} fullWidth maxWidth="sm">
                <DialogTitle>
                    View {viewItem?.type === 'process' ? 'Process' : 'Sub-Assembly'}
                    <IconButton
                        aria-label="close"
                        onClick={() => setViewItem(null)}
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                    >
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="h6">Name</Typography>
                    <Typography>{viewItem?.item.name}</Typography>
                    <Typography variant="h6" sx={{ mt: 2 }}>
                        Description
                    </Typography>
                    <Typography>{viewItem?.item.description || 'No Description'}</Typography>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SubAssemblies;
