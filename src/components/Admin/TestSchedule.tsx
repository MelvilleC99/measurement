// src/components/Admin/TestSchedule.tsx

import React, { useState, useRef } from 'react';
import {
    Box,
    Typography,
    Paper,
    Modal,
    Button,
} from '@mui/material';
import {
    DndContext,
    DragOverlay,
    useSensors,
    useSensor,
    PointerSensor,
    DragStartEvent,
    DragEndEvent,
    closestCenter,
} from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { format, addDays, differenceInCalendarDays, addWeeks, isBefore } from 'date-fns';

// Define the structure of a StyleCard
interface StyleCard {
    id: string;
    name: string;
    startDate: Date;
    duration: number; // in days
    color: string;
    dependencies?: string[];
}

// Define the structure of a ProductionLine
interface ProductionLine {
    id: string;
    name: string;
    styleCards: StyleCard[];
}

// Constants for dimensions
const DAY_WIDTH = 100;
const ROW_HEIGHT = 80;
const HEADER_HEIGHT = 60;
const MONTH_HEADER_HEIGHT = 30;

// Modal style
const modalStyle = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    borderRadius: 2,
    boxShadow: 24,
    p: 4,
};

// Helper function to generate dates
const generateDates = (start: Date, end: Date): Date[] => {
    const dates: Date[] = [];
    let current = new Date(start);
    while (current <= end) {
        dates.push(new Date(current));
        current = addDays(current, 1);
    }
    return dates;
};

// Helper function to group dates by month using reduce to ensure currentGroup is always defined
const groupDatesByMonth = (dates: Date[]): { month: string; dates: Date[] }[] => {
    return dates.reduce<{ month: string; dates: Date[] }[]>((months, date) => {
        const month = format(date, 'MMM yyyy');
        let currentGroup = months[months.length - 1];
        if (!currentGroup || currentGroup.month !== month) {
            currentGroup = { month, dates: [] };
            months.push(currentGroup);
        }
        currentGroup.dates.push(date);
        return months;
    }, []);
};

// Helper to check if a date is weekend
const isWeekend = (date: Date): boolean => {
    const day = date.getDay();
    return day === 0 || day === 6;
};

// Resolve overlapping styles within a production line
const resolveConflicts = (styleCards: StyleCard[]): StyleCard[] => {
    // Sort by startDate
    const sorted = [...styleCards].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    const resolved: StyleCard[] = [];

    sorted.forEach((card) => {
        if (resolved.length === 0) {
            resolved.push(card);
        } else {
            const last = resolved[resolved.length - 1];
            const lastEnd = addDays(last.startDate, last.duration);
            if (isBefore(card.startDate, lastEnd)) {
                // Adjust the startDate to be after the last style
                card.startDate = new Date(lastEnd);
            }
            resolved.push(card);
        }
    });

    return resolved;
};

// Handle dependencies across all production lines
const handleDependencies = (
    lines: ProductionLine[],
    movedStyleId: string,
    findStyleCard: (id: string) => StyleCard | null
): ProductionLine[] => {
    const movedStyle = findStyleCard(movedStyleId);
    if (!movedStyle || !movedStyle.dependencies) return lines;

    let updatedLines = [...lines];

    movedStyle.dependencies.forEach(depId => {
        const depStyle = findStyleCard(depId);
        if (depStyle) {
            // Update the dependent style's start date
            const newStartDate = addDays(movedStyle.startDate, movedStyle.duration);
            depStyle.startDate = new Date(newStartDate);
            // Find the production line of the dependent style
            const depLineIndex = updatedLines.findIndex(line => line.styleCards.some(card => card.id === depId));
            if (depLineIndex !== -1) {
                const depLine = updatedLines[depLineIndex];
                const updatedDepCards = depLine.styleCards.map(card => card.id === depId ? depStyle : card);
                // Resolve conflicts in the dependent line
                updatedDepCards.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
                updatedLines[depLineIndex].styleCards = resolveConflicts(updatedDepCards);
            }
        }
    });

    return updatedLines;
};

// Sub-Components

interface StyleCardComponentProps {
    card: StyleCard;
    left: number;
    width: number;
    rowHeight: number;
    onClick: () => void;
}

const StyleCardComponent: React.FC<StyleCardComponentProps> = ({ card, left, width, rowHeight, onClick }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: card.id,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 3,
    } : { zIndex: 1 };

    return (
        <Paper
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            elevation={3}
            onClick={onClick}
            sx={{
                position: 'absolute',
                top: 10,
                height: rowHeight - 20,
                borderRadius: 1,
                bgcolor: card.color,
                color: 'white',
                px: 1,
                display: 'flex',
                alignItems: 'center',
                cursor: 'grab',
                ...style,
                left: `${left}px`,
                width: `${width}px`,
                boxSizing: 'border-box',
                boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.15)',
                '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                },
                userSelect: 'none',
            }}
        >
            <Typography variant="body2" noWrap>{card.name}</Typography>
        </Paper>
    );
};

interface DropZoneProps {
    id: string;
    isWeekend: boolean;
}

const DropZone: React.FC<DropZoneProps> = ({ id, isWeekend }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: id,
    });

    return (
        <Box
            ref={setNodeRef}
            sx={{
                width: DAY_WIDTH,
                borderRight: 1,
                borderColor: 'divider',
                height: '100%',
                bgcolor: isWeekend ? 'action.hover' : 'background.paper',
                position: 'relative',
                transition: 'background-color 0.3s',
                flexShrink: 0,
                ...(isOver && {
                    bgcolor: 'primary.light',
                }),
            }}
        />
    );
};

interface ActiveDragOverlayProps {
    id: string;
    findStyleCard: (id: string) => StyleCard | null;
}

const ActiveDragOverlay: React.FC<ActiveDragOverlayProps> = ({ id, findStyleCard }) => {
    const card = findStyleCard(id);
    if (!card) return null;

    return (
        <Paper
            elevation={4}
            sx={{
                height: ROW_HEIGHT - 20,
                borderRadius: 1,
                bgcolor: card.color,
                color: 'white',
                px: 1,
                display: 'flex',
                alignItems: 'center',
                opacity: 0.8,
                width: `${card.duration * DAY_WIDTH - 10}px`,
                boxSizing: 'border-box',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
        >
            <Typography variant="body2" noWrap>{card.name}</Typography>
        </Paper>
    );
};

// Main Component
const TestSchedule: React.FC = () => {
    // Initial mock data
    const [productionLines, setProductionLines] = useState<ProductionLine[]>([
        {
            id: "line1",
            name: "Production Line 1",
            styleCards: [
                {
                    id: "style1",
                    name: "Style A",
                    startDate: new Date(),
                    duration: 3,
                    color: "#2196f3",
                    dependencies: ["style2"],
                },
                {
                    id: "style2",
                    name: "Style B",
                    startDate: addDays(new Date(), 3),
                    duration: 2,
                    color: "#4caf50",
                },
            ],
        },
        {
            id: "line2",
            name: "Production Line 2",
            styleCards: [
                {
                    id: "style3",
                    name: "Style C",
                    startDate: addDays(new Date(), 1),
                    duration: 4,
                    color: "#9c27b0",
                    dependencies: ["style1"],
                },
            ],
        },
        {
            id: "line3",
            name: "Production Line 3",
            styleCards: [],
        },
    ]);

    const [activeId, setActiveId] = useState<string | null>(null);
    const [selectedStyle, setSelectedStyle] = useState<StyleCard | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Define the timeline range
    const startDate = new Date(); // Current date
    const endDate = addWeeks(startDate, 12); // Next 12 weeks

    const dates = generateDates(startDate, endDate);
    const months = groupDatesByMonth(dates);

    // Handle drag start
    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    // Handle drag end
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) {
            setActiveId(null);
            return;
        }

        const activeStyle = findStyleCard(active.id as string);
        if (!activeStyle) {
            setActiveId(null);
            return;
        }

        // Determine new date and production line based on drop target's id
        const dropZoneId = over.id as string;
        const [targetLineId, dateString] = dropZoneId.split('-');
        const targetDate = new Date(dateString);

        const newStartDate = new Date(targetDate);
        newStartDate.setHours(0, 0, 0, 0);

        // Update the style's start date and move it to the target production line
        setProductionLines((prevLines) => {
            const newLines = prevLines.map(line => {
                // Remove the style from its current line
                return {
                    ...line,
                    styleCards: line.styleCards.filter(card => card.id !== activeStyle.id),
                };
            }).map(line => {
                if (line.id === targetLineId) {
                    const updatedStyle: StyleCard = { ...activeStyle, startDate: newStartDate };
                    return {
                        ...line,
                        styleCards: [...line.styleCards, updatedStyle],
                    };
                }
                return line;
            });

            // Resolve conflicts to prevent overlapping
            const resolvedLines = newLines.map(line => ({
                ...line,
                styleCards: resolveConflicts(line.styleCards),
            }));

            // Handle dependencies
            return handleDependencies(resolvedLines, activeStyle.id, findStyleCard);
        });

        setActiveId(null);
    };

    // Helper to find a style card by ID
    const findStyleCard = (id: string): StyleCard | null => {
        for (const line of productionLines) {
            const card = line.styleCards.find((card) => card.id === id);
            if (card) return card;
        }
        return null;
    };

    // Handle selecting a style to show details
    const handleStyleClick = (card: StyleCard) => {
        setSelectedStyle(card);
    };

    // Close the modal
    const handleCloseModal = () => {
        setSelectedStyle(null);
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToHorizontalAxis]}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default' }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="h6">Production Schedule</Typography>
                </Box>

                <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
                    {/* Fixed left column */}
                    <Box sx={{ width: 220, flexShrink: 0, bgcolor: 'background.paper', position: 'relative' }}>
                        {/* Production Lines Header */}
                        <Box sx={{
                            height: HEADER_HEIGHT,
                            borderBottom: 1,
                            borderColor: 'divider',
                            px: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'background.paper',
                            position: 'sticky',
                            top: 0,
                            zIndex: 3,
                        }}>
                            <Typography variant="subtitle2">Production Lines</Typography>
                        </Box>
                        {/* Production Lines */}
                        <Box sx={{ overflowY: 'auto', maxHeight: 'calc(100vh - 64px - HEADER_HEIGHT)' }}>
                            {productionLines.map((line) => (
                                <Box key={line.id} sx={{
                                    px: 2,
                                    borderBottom: 1,
                                    borderColor: 'divider',
                                    height: ROW_HEIGHT,
                                    display: 'flex',
                                    alignItems: 'center',
                                    bgcolor: 'background.paper',
                                    '&:hover': {
                                        backgroundColor: 'action.hover',
                                    }
                                }}>
                                    <Typography variant="body2">{line.name}</Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>

                    {/* Scrollable timeline */}
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        {/* Scrollable container */}
                        <Box
                            sx={{
                                overflowX: 'auto',
                                overflowY: 'auto',
                                flex: 1,
                                minHeight: 0,
                                position: 'relative',
                            }}
                        >
                            <Box sx={{ minWidth: dates.length * DAY_WIDTH }}>
                                {/* Month Header */}
                                <Box
                                    sx={{
                                        display: 'flex',
                                        borderBottom: 1,
                                        borderColor: 'divider',
                                        height: MONTH_HEADER_HEIGHT,
                                        position: 'sticky',
                                        top: HEADER_HEIGHT,
                                        backgroundColor: 'background.paper',
                                        zIndex: 2,
                                    }}
                                >
                                    {months.map(({ month, dates: monthDates }) => (
                                        <Box
                                            key={month}
                                            sx={{
                                                width: `${monthDates.length * DAY_WIDTH}px`,
                                                borderRight: 1,
                                                borderColor: 'divider',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                px: 1,
                                                py: 1,
                                                flexShrink: 0,
                                            }}
                                        >
                                            <Typography variant="subtitle2">{month}</Typography>
                                        </Box>
                                    ))}
                                </Box>

                                {/* Day headers */}
                                <Box
                                    sx={{
                                        display: 'flex',
                                        borderBottom: 1,
                                        borderColor: 'divider',
                                        height: HEADER_HEIGHT,
                                        position: 'sticky',
                                        top: HEADER_HEIGHT + MONTH_HEADER_HEIGHT,
                                        backgroundColor: 'background.paper',
                                        zIndex: 2,
                                    }}
                                >
                                    {dates.map((date) => (
                                        <Box
                                            key={date.toISOString()}
                                            id={date.toISOString()}
                                            sx={{
                                                width: DAY_WIDTH,
                                                borderRight: 1,
                                                borderColor: 'divider',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                bgcolor: isWeekend(date) ? 'action.hover' : 'background.paper',
                                                flexShrink: 0,
                                            }}
                                        >
                                            <Typography variant="caption">{format(date, 'E d')}</Typography>
                                        </Box>
                                    ))}
                                </Box>

                                {/* Production Lines */}
                                {productionLines.map((line) => (
                                    <Box key={line.id} sx={{
                                        display: 'flex',
                                        borderBottom: 1,
                                        borderColor: 'divider',
                                        position: 'relative',
                                        height: ROW_HEIGHT,
                                        backgroundColor: 'background.paper',
                                    }}>
                                        {/* Drop Zones */}
                                        {dates.map((date) => {
                                            const dropZoneId = `${line.id}-${date.toISOString()}`;
                                            return (
                                                <DropZone
                                                    key={dropZoneId}
                                                    id={dropZoneId}
                                                    isWeekend={isWeekend(date)}
                                                />
                                            );
                                        })}
                                        {/* Style Cards */}
                                        {line.styleCards.map((card) => {
                                            const startDiff = differenceInCalendarDays(card.startDate, startDate);
                                            const left = startDiff * DAY_WIDTH;
                                            const width = card.duration * DAY_WIDTH - 10; // Adjust for padding

                                            return (
                                                <StyleCardComponent
                                                    key={card.id}
                                                    card={card}
                                                    left={left}
                                                    width={width}
                                                    rowHeight={ROW_HEIGHT}
                                                    onClick={() => handleStyleClick(card)}
                                                />
                                            );
                                        })}
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </Box>
            <DragOverlay>
                {activeId ? <ActiveDragOverlay id={activeId} findStyleCard={findStyleCard} /> : null}
            </DragOverlay>

            {/* Style Details Modal */}
            <Modal
                open={!!selectedStyle}
                onClose={handleCloseModal}
                aria-labelledby="style-details-title"
                aria-describedby="style-details-description"
            >
                <Box sx={modalStyle}>
                    {selectedStyle && (
                        <>
                            <Typography id="style-details-title" variant="h6" component="h2">
                                {selectedStyle.name}
                            </Typography>
                            <Typography id="style-details-description" sx={{ mt: 2 }}>
                                <strong>ID:</strong> {selectedStyle.id}
                            </Typography>
                            <Typography sx={{ mt: 1 }}>
                                <strong>Start Date:</strong> {format(selectedStyle.startDate, 'PPP')}
                            </Typography>
                            <Typography sx={{ mt: 1 }}>
                                <strong>Duration:</strong> {selectedStyle.duration} day(s)
                            </Typography>
                            <Typography sx={{ mt: 1 }}>
                                <strong>Dependencies:</strong> {selectedStyle.dependencies ? selectedStyle.dependencies.join(', ') : 'None'}
                            </Typography>
                            <Button onClick={handleCloseModal} sx={{ mt: 2 }} variant="contained">Close</Button>
                        </>
                    )}
                </Box>
            </Modal>
        </DndContext>
    )};

// Exporting Sub-Components is optional if they are only used within TestSchedule
// If you prefer to keep them encapsulated, you can define them inside the main component.

export default TestSchedule;
