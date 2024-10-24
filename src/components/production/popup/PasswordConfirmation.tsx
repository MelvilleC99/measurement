// src/components/production/popup/PasswordConfirmation.tsx
import React, { useState } from 'react';
import './PasswordConfirmation.css';

interface PasswordConfirmationProps {
    item: string;
    onConfirm: (password: string) => Promise<void> | void;
}

const PasswordConfirmation: React.FC<PasswordConfirmationProps> = ({ item, onConfirm }) => {
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');

    const handleSubmit = async () => {
        if (!password) {
            setError('Please enter the password.');
            return;
        }
        try {
            await onConfirm(password);
            setPassword('');
            setError('');
        } catch {
            setError('Invalid password.');
        }
    };

    return (
        <div className="password-confirmation">
            <h4>{item}</h4>
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Password"
            />
            {error && <p className="error">{error}</p>}
            <button onClick={handleSubmit}>Confirm</button>
        </div>
    );
};

export default PasswordConfirmation;