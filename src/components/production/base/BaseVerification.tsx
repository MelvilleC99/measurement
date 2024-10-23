// src/components/production/base/BaseVerification.tsx

import React, { useState, Dispatch, SetStateAction } from 'react';
import { SupportFunction } from '../../../types';
import './BaseVerification.css';

export interface BaseVerificationProps {
    personnel: SupportFunction[];
    onVerify: (selectedId: string, password: string, comment?: string) => boolean | Promise<boolean>;
    title: string;
    errorMessage?: string;
    setErrorMessage: Dispatch<SetStateAction<string>>;
    className?: string;
    selectedId?: string;
    setSelectedId?: Dispatch<SetStateAction<string>>;
    comment?: string;
    setComment?: Dispatch<SetStateAction<string>>;
    showComment?: boolean;
    isDisabled?: boolean;
}

const BaseVerification: React.FC<BaseVerificationProps> = ({
                                                               personnel,
                                                               onVerify,
                                                               title,
                                                               errorMessage,
                                                               setErrorMessage,
                                                               className = "",
                                                               selectedId: externalSelectedId,
                                                               setSelectedId: externalSetSelectedId,
                                                               comment: externalComment,
                                                               setComment: externalSetComment,
                                                               showComment = false,
                                                               isDisabled = false
                                                           }) => {
    const [internalSelectedId, setInternalSelectedId] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [internalComment, setInternalComment] = useState<string>('');

    // Use external state if provided, otherwise use internal state
    const selectedId = externalSelectedId !== undefined ? externalSelectedId : internalSelectedId;
    const setSelectedId = externalSetSelectedId || setInternalSelectedId;
    const comment = externalComment !== undefined ? externalComment : internalComment;
    const setComment = externalSetComment || setInternalComment;

    const handleVerification = async () => {
        if (!selectedId || !password) {
            setErrorMessage('Please select personnel and enter password');
            return false;
        }

        try {
            const result = await onVerify(selectedId, password, comment);
            if (!result) {
                setErrorMessage('Invalid credentials');
                setPassword('');
                return false;
            }

            // Reset form after successful verification
            if (!externalSelectedId) setInternalSelectedId('');
            if (!externalComment) setInternalComment('');
            setPassword('');
            return true;
        } catch (error) {
            setErrorMessage('Verification failed. Please try again.');
            setPassword('');
            return false;
        }
    };

    return (
        <div className={`verification-form ${className}`}>
            <div className="form-group">
                <label>
                    Select {title}:
                    <select
                        value={selectedId}
                        onChange={(e) => setSelectedId(e.target.value)}
                        className="form-control"
                        disabled={isDisabled}
                    >
                        <option value="">Select {title}</option>
                        {personnel.map(person => (
                            <option key={person.id} value={person.id}>
                                {person.name} {person.surname} {person.employeeNumber ? `- ${person.employeeNumber}` : ''}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="form-group">
                <label>
                    Password:
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="form-control"
                        disabled={isDisabled || !selectedId}
                        placeholder="Enter password"
                    />
                </label>
            </div>

            {showComment && (
                <div className="form-group">
                    <label>
                        Comment:
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="form-control"
                            disabled={isDisabled}
                            placeholder="Add any additional comments..."
                            rows={3}
                        />
                    </label>
                </div>
            )}

            {errorMessage && (
                <div className="error-message">
                    {errorMessage}
                </div>
            )}
        </div>
    );
};

export default BaseVerification;