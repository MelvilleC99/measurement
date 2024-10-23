import React from 'react';
import { useNavigate } from 'react-router-dom'; // Assuming you're using React Router for navigation
import Button from '@mui/material/Button';
import './AssetControl.css'; // Optional: styling for this page

const AssetControlLanding: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="asset-control-landing">
            <h1>Asset Control</h1>
            <p>Select an option below to manage machine locations or assign machines:</p>

            <div className="button-container">
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => navigate('/assetcontrol/location-manager')}
                >
                    Manage Locations
                </Button>

                <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => navigate('/assetcontrol/assign-machines')}
                >
                    Assign Machines to Locations
                </Button>
            </div>
        </div>
    );
};

export default AssetControlLanding;
