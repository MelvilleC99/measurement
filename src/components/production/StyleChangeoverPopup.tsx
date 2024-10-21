import React, { useState } from 'react';
import './StyleChangeoverPopup.css';

interface StyleChangeoverPopupProps {
    onClose: () => void;
    onAction: (action: string, password: string, comment: string) => void;
    currentAction: string;
    isQCRequired: boolean;
}

const StyleChangeoverPopup: React.FC<StyleChangeoverPopupProps> = ({
                                                                       onClose,
                                                                       onAction,
                                                                       currentAction,
                                                                       isQCRequired
                                                                   }) => {
    const [password, setPassword] = useState('');
    const [comment, setComment] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = () => {
        if (!password) {
            setErrorMessage('Please enter the password.');
            return;
        }

        onAction(currentAction, password, comment);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>{currentAction}</h2>
                {errorMessage && <p className="error-message">{errorMessage}</p>}
                <label>
                    {isQCRequired ? 'QC Password:' : 'Supervisor Password:'}
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </label>
                <label>
                    Comment (optional):
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                    />
                </label>
                <button className="submit-button" onClick={handleSubmit}>Confirm</button>
                <button className="cancel-button" onClick={onClose}>Cancel</button>
            </div>
        </div>
    );
};

export default StyleChangeoverPopup;