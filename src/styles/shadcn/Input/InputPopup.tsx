"use client";

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import { X } from "lucide-react";
import { cn } from "../../../lib/utils";

export interface InputField {
    id: string;
    type: 'text' | 'number' | 'select' | 'textarea' | 'password';
    label: string;
    placeholder?: string;
    required?: boolean;
    options?: { value: string; label: string; }[];
    value: any;
    onChange: (value: any) => void;
}

interface InputPopupProps {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    fields: InputField[];
    onSubmit: () => Promise<void>;
    isSubmitting?: boolean;
    error?: string;
    submitText?: string;
    cancelText?: string;
    className?: string;
}

const InputPopup = ({
                        open,
                        onClose,
                        title,
                        subtitle,
                        fields,
                        onSubmit,
                        isSubmitting = false,
                        error,
                        submitText = "Submit",
                        cancelText = "Cancel",
                        className
                    }: InputPopupProps) => {
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isSubmitting) {
            await onSubmit();
        }
    };

    const renderField = (field: InputField) => {
        switch (field.type) {
            case 'select':
                return (
                    <Select
                        value={field.value}
                        onValueChange={field.onChange}
                    >
                        <SelectTrigger id={field.id}>
                            <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
                        </SelectTrigger>
                        <SelectContent>
                            {field.options?.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );

            case 'textarea':
                return (
                    <Textarea
                        id={field.id}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        placeholder={field.placeholder}
                        required={field.required}
                        className="min-h-[80px]"
                    />
                );

            default:
                return (
                    <Input
                        id={field.id}
                        type={field.type}
                        value={field.value}
                        onChange={(e) => field.onChange(
                            field.type === 'number' ? Number(e.target.value) : e.target.value
                        )}
                        placeholder={field.placeholder}
                        required={field.required}
                    />
                );
        }
    };

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className={cn("sm:max-w-lg", className)}>
                <DialogHeader className="px-1">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-xl font-semibold">
                                {title}
                            </DialogTitle>
                            {subtitle && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="rounded-full h-8 w-8"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogHeader>

                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        {fields.map((field) => (
                            <div key={field.id} className="space-y-2">
                                <label
                                    htmlFor={field.id}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    {field.label} {field.required && <span className="text-destructive">*</span>}
                                </label>
                                {renderField(field)}
                            </div>
                        ))}
                    </div>

                    <DialogFooter className="gap-3 sm:gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            {cancelText}
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Submitting..." : submitText}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default InputPopup;