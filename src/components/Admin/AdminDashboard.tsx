import React, { useState } from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    List,
    ListItem,
    ListItemText,
    IconButton,
    CssBaseline,
    Box,
    ThemeProvider,
    createTheme,
    Paper,
    Button as MuiButton,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { ArrowBack as ArrowBackIcon, Close as CloseIcon } from '@mui/icons-material';

// Import your components
import ProductionLines from './ProductionLines';
import TimeTables from './TimeTables';
import WorkDays from './Workdays';
import SupportFunctions from './SupportFunctions';
import MachineList from './MachineList';
import ProductionSchedule from './ProductionSchedule';
import Downtime from './DownTime';
import StyleCard from './StyleCard';
import ProductHierarchyList from './ProductHierarchyList';
import ScheduleOvertime from './ScheduleOvertime';
import TestSchedule from './TestSchedule';
import ComponentTest from './ComponentTest';
import SubAssemblies from './SubAssemblies'; // Import SubAssemblies

// Define your custom theme
const theme = createTheme({
    palette: {
        primary: {
            main: '#082f49',
        },
        background: {
            default: '#f5f5f5',
        },
    },
});

// Styled components for layout
const PageContainer = styled(Box)({
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
});

const ContentContainer = styled(Box)({
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
});

const MenuList = styled(List)({
    width: '250px',
    borderRight: '1px solid rgba(0, 0, 0, 0.12)',
    overflowY: 'auto',
    backgroundColor: '#f5f5f5',
    padding: '16px 0',
});

const ContentArea = styled(Box)(({ theme }) => ({
    flex: 1,
    padding: theme.spacing(3),
    overflowY: 'auto',
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
    height: '100%',
    position: 'relative',
    padding: theme.spacing(3),
}));

const CloseButton = styled(IconButton)({
    position: 'absolute',
    right: 8,
    top: 8,
});

// Define your menu items (including SubAssemblies)
const menuItems = [
    { id: 'ProductionLines', label: 'Add Production Lines' },
    { id: 'TimeTables', label: 'Time Tables' },
    { id: 'WorkDays', label: 'Work Days' },
    { id: 'SupportFunctions', label: 'Support Functions' },
    { id: 'MachineList', label: 'Machine List' },
    { id: 'ProductionSchedule', label: 'Production Schedule' },
    { id: 'Downtime', label: 'Downtime' },
    { id: 'StyleCard', label: 'Load Style' },
    { id: 'ProductHierarchy', label: 'Product Hierarchy' },
    { id: 'ScheduleOvertime', label: 'Schedule Overtime' },
    { id: 'TestSchedule', label: 'Test Schedule' },
    { id: 'ComponentTest', label: 'Test Components' },
    { id: 'SubAssemblies', label: 'Sub-Assemblies' }, // New Menu Item
];

const AdminDashboard: React.FC = () => {
    const [selectedOption, setSelectedOption] = useState<string | null>(null);

    const handleOptionClick = (option: string) => {
        setSelectedOption(option);
    };

    const handleCloseContent = () => {
        setSelectedOption(null);
    };

    const handleBackToHome = () => {
        window.history.back();
    };

    const renderContent = () => {
        switch (selectedOption) {
            case 'ProductionLines':
                return <ProductionLines />;
            case 'TimeTables':
                return <TimeTables />;
            case 'WorkDays':
                return <WorkDays />;
            case 'SupportFunctions':
                return <SupportFunctions />;
            case 'MachineList':
                return <MachineList />;
            case 'ProductionSchedule':
                return <ProductionSchedule />;
            case 'Downtime':
                return <Downtime />;
            case 'StyleCard':
                return <StyleCard />;
            case 'ProductHierarchy':
                return <ProductHierarchyList />;
            case 'ScheduleOvertime':
                return <ScheduleOvertime />;
            case 'TestSchedule':
                return <TestSchedule />;
            case 'ComponentTest':
                return <ComponentTest />;
            case 'SubAssemblies': // Handle SubAssemblies
                return <SubAssemblies />;
            default:
                return null;
        }
    };

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <PageContainer>
                {/* Full-width AppBar */}
                <AppBar position="sticky">
                    <Toolbar>
                        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                            Admin Dashboard
                        </Typography>
                        <MuiButton
                            variant="outlined"
                            color="inherit"
                            onClick={handleBackToHome}
                            startIcon={<ArrowBackIcon />}
                            sx={{
                                color: '#fff',
                                borderColor: '#fff',
                                '&:hover': {
                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                },
                            }}
                        >
                            Back to Home
                        </MuiButton>
                    </Toolbar>
                </AppBar>

                {/* Content Area with Menu and Main Content */}
                <ContentContainer>
                    {/* Left Menu */}
                    <MenuList>
                        {menuItems.map((item) => (
                            <ListItem
                                button
                                key={item.id}
                                onClick={() => handleOptionClick(item.id)}
                                selected={selectedOption === item.id}
                                sx={{
                                    '&.Mui-selected': {
                                        backgroundColor: 'rgba(8, 47, 73, 0.08)',
                                        '&:hover': {
                                            backgroundColor: 'rgba(8, 47, 73, 0.12)',
                                        },
                                    },
                                    '&:hover': {
                                        backgroundColor: 'rgba(8, 47, 73, 0.04)',
                                    },
                                }}
                            >
                                <ListItemText primary={item.label} />
                            </ListItem>
                        ))}
                    </MenuList>

                    {/* Main Content */}
                    <ContentArea>
                        {selectedOption && (
                            <StyledPaper elevation={3}>
                                <CloseButton onClick={handleCloseContent}>
                                    <CloseIcon />
                                </CloseButton>
                                {renderContent()}
                            </StyledPaper>
                        )}
                    </ContentArea>
                </ContentContainer>
            </PageContainer>
        </ThemeProvider>
    );
};

export default AdminDashboard;