// src/components/production/popup/CommentsInput.tsx
import React, { useState } from 'react';
import './CommentsInput.css';

interface CommentsInputProps {
    onSubmit: (comments: string) => void;
}

const CommentsInput: React.FC<CommentsInputProps> = ({ onSubmit }) => {
    const [comments, setComments] = useState<string>('');

    const handleSubmit = () => {
        onSubmit(comments);
    };

    return (
        <div className="comments-input">
            <h4>Add Comments (Optional)</h4>
            <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Enter comments here..."
            />
            <button onClick={handleSubmit}>Submit Comments and Close</button>
        </div>
    );
};

export default CommentsInput;