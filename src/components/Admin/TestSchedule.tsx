import React, { useState, useRef } from 'react';
import {
    Box,
    Typography,
    Paper,
} from '@mui/material';
import {
    DndContext,
    DragOverlay,
    useSensors,
    useSensor,
    PointerSensor,
    DragStartEvent,
    DragEndEvent
} from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { useDraggable, useDroppable } from "@dnd-kit/core";

// Define the structure of a StyleCard
interface StyleCard {
    id: string;
    name: string;
    startDate: Date;
    duration: number;
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
const DAY_WIDTH = 40;
const ROW_HEIGHT = 50;

const TestSchedule: React.FC = () => {
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
                    startDate: new Date(new Date().setDate(new Date().getDate() + 3)),
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
                    startDate: new Date(new Date().setDate(new Date().getDate() + 1)),
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
    const scrollRef = useRef<HTMLDivElement>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Generate dates for the timeline
    const startDate = new Date(); // Current date
    const endDate = new Date(2025, 6, 31); // July 31, 2025

    const numberOfDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const dates = Array.from({ length: numberOfDays }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        return date;
    });

    // Group dates by week
    const groupDatesByWeek = (dates: Date[]) => {
        const weeks: { start: Date; dates: Date[] }[] = [];
        let currentWeek: { start: Date; dates: Date[] } | null = null;

        dates.forEach((date) => {
            const dayOfWeek = date.getDay();
            if (dayOfWeek === 0 || !currentWeek) {
                // Start of a new week
                currentWeek = { start: new Date(date), dates: [] };
                weeks.push(currentWeek);
            }
            currentWeek.dates.push(date);
        });

        return weeks;
    };

    const weeks = groupDatesByWeek(dates);

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', { day: 'numeric', weekday: 'short' }).format(date);
    };

    const formatWeek = (start: Date) => {
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeStyle = findStyleCard(active.id as string);
        if (!activeStyle) return;

        const overDate = new Date(over.id as string);
        const newStartDate = new Date(overDate);
        newStartDate.setHours(0, 0, 0, 0);

        setProductionLines((prevLines) => {
            const newLines = [...prevLines];
            const lineIndex = newLines.findIndex((line) =>
                line.styleCards.some((card) => card.id === activeStyle.id)
            );
            if (lineIndex === -1) return prevLines;

            const cardIndex = newLines[lineIndex].styleCards.findIndex((card) => card.id === activeStyle.id);
            if (cardIndex === -1) return prevLines;

            const updatedCard = { ...newLines[lineIndex].styleCards[cardIndex], startDate: newStartDate };
            newLines[lineIndex].styleCards[cardIndex] = updatedCard;

            // Update dependent cards
            newLines.forEach((line) => {
                line.styleCards.forEach((card) => {
                    if (card.dependencies?.includes(activeStyle.id)) {
                        const diff = newStartDate.getTime() - activeStyle.startDate.getTime();
                        card.startDate = new Date(card.startDate.getTime() + diff);
                    }
                });
            });

            return newLines;
        });

        setActiveId(null);
    };

    const findStyleCard = (id: string): StyleCard | null => {
        for (const line of productionLines) {
            const card = line.styleCards.find((card) => card.id === id);
            if (card) return card;
        }
        return null;
    };

    const isWeekend = (date: Date) => {
        const day = date.getDay();
        return day === 0 || day === 6;
    };

    return (
        <DndContext
            sensors={sensors}
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
                    <Box sx={{ width: 200, flexShrink: 0, bgcolor: 'background.paper', position: 'relative' }}>
                        {/* Production Lines Header */}
                        <Box sx={{
                            height: ROW_HEIGHT * 2,
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
                        <Box sx={{ overflowY: 'auto', maxHeight: 'calc(100vh - 64px - 2 * ROW_HEIGHT)' }}>
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
                            ref={scrollRef}
                            sx={{
                                overflowX: 'auto',
                                overflowY: 'auto',
                                flex: 1,
                                minHeight: 0,
                            }}
                        >
                            <Box sx={{ minWidth: dates.length * DAY_WIDTH }}>
                                {/* Timeline Header */}
                                <Box
                                    id="timeline-header"
                                    sx={{
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 2,
                                        backgroundColor: 'background.paper',
                                    }}
                                >
                                    {/* Week headers */}
                                    <Box sx={{ display: 'flex', borderBottom: 1, borderColor: 'divider', height: ROW_HEIGHT }}>
                                        {weeks.map(({ start, dates: weekDates }) => (
                                            <Box
                                                key={start.toISOString()}
                                                sx={{
                                                    width: `${weekDates.length * DAY_WIDTH}px`,
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
                                                <Typography variant="subtitle2">{formatWeek(start)}</Typography>
                                            </Box>
                                        ))}
                                    </Box>

                                    {/* Day headers */}
                                    <Box sx={{ display: 'flex', borderBottom: 1, borderColor: 'divider', height: ROW_HEIGHT }}>
                                        {dates.map((date) => (
                                            <Box
                                                key={date.toISOString()}
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
                                                <Typography variant="caption">{formatDate(date)}</Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>

                                {/* Grid and style cards */}
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
                                        {dates.map((date) => (
                                            <DropZone
                                                key={date.toISOString()}
                                                id={date.toISOString()}
                                                isWeekend={isWeekend(date)}
                                            />
                                        ))}
                                        {/* Style Cards */}
                                        {line.styleCards.map((card) => {
                                            const startDiff = Math.floor(
                                                (card.startDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
                                            );
                                            const left = startDiff * DAY_WIDTH;
                                            const width = card.duration * DAY_WIDTH - 4;

                                            return (
                                                <StyleCardComponent
                                                    key={card.id}
                                                    card={card}
                                                    left={left}
                                                    width={width}
                                                    rowHeight={ROW_HEIGHT}
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
        </DndContext>
    )
};

// Sub-Components Defined Externally

interface StyleCardComponentProps {
    card: StyleCard;
    left: number;
    width: number;
    rowHeight: number;
}

const StyleCardComponent: React.FC<StyleCardComponentProps> = ({ card, left, width, rowHeight }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
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
            sx={{
                position: 'absolute',
                top: 4,
                height: rowHeight - 8,
                borderRadius: 1,
                bgcolor: card.color,
                color: 'white',
                px: 1,
                display: 'flex',
                alignItems: 'center',
                cursor: 'move',
                ...style,
                left: `${left}px`,
                width: `${width}px`,
                boxSizing: 'border-box',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                },
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
                height: ROW_HEIGHT - 8,
                borderRadius: 1,
                bgcolor: card.color,
                color: 'white',
                px: 1,
                display: 'flex',
                alignItems: 'center',
                opacity: 0.8,
                width: `${card.duration * DAY_WIDTH - 4}px`,
                boxSizing: 'border-box',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
        >
            <Typography variant="body2" noWrap>{card.name}</Typography>
        </Paper>
    );
};

export default TestSchedule;
