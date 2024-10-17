// src/components/LineSetup/LineSetup.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BasicInfo, ProductionTarget, TimeTable, TimeSlot } from '../../types';
import './LineSetup.css';
import Modal from 'react-modal';

interface LineSetupProps {
    basicInfo: BasicInfo;
    setBasicInfo: React.Dispatch<React.SetStateAction<BasicInfo>>;
    productionTarget: ProductionTarget;
    setProductionTarget: React.Dispatch<React.SetStateAction<ProductionTarget>>;
}

const LineSetup: React.FC<LineSetupProps> = ({
                                                 basicInfo,
                                                 setBasicInfo,
                                                 productionTarget,
                                                 setProductionTarget,
                                             }) => {
    const [step, setStep] = useState<number>(1);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [timeTableName, setTimeTableName] = useState<string>('');
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

    const navigate = useNavigate();

    const handleBasicInfoChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setBasicInfo({ ...basicInfo, [name]: value });
    };

    const openModal = () => {
        setIsModalOpen(true);
        const slots: TimeSlot[] = Array.from({ length: 8 }, (_, i) => ({
            id: i + 1,
            startTime: '',
            endTime: '',
        }));
        setTimeSlots(slots);
    };

    const setDefaultTimeTable = () => {
        const defaultSlots: TimeSlot[] = [
            { id: 1, startTime: '07:00', endTime: '08:00' },
            { id: 2, startTime: '08:00', endTime: '09:00' },
            { id: 3, startTime: '09:00', endTime: '10:00', break: { type: 'Tea', duration: 15 } },
            { id: 4, startTime: '10:00', endTime: '11:00' },
            { id: 5, startTime: '12:00', endTime: '13:00' },
            { id: 6, startTime: '13:00', endTime: '14:00', break: { type: 'Lunch', duration: 40 } },
            { id: 7, startTime: '14:00', endTime: '15:00' },
            { id: 8, startTime: '15:00', endTime: '16:00' },
        ];

        const newTimeTable: TimeTable = {
            name: 'Default Timetable',
            days: [],
            timeSlots: defaultSlots,
        };

        setProductionTarget({
            ...productionTarget,
            timeTables: [...productionTarget.timeTables, newTimeTable],
        });
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeTableName('');
        setTimeSlots([]);
    };

    const handleTimeTableNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTimeTableName(e.target.value);
    };

    const handleTimeSlotChange = (slotId: number, field: keyof TimeSlot, value: string) => {
        const updatedSlots = timeSlots.map((slot) =>
            slot.id === slotId ? { ...slot, [field]: value } : slot
        );
        setTimeSlots(updatedSlots);
    };

    const saveTimeTable = () => {
        if (!timeTableName) {
            alert('Please enter a name for the timetable.');
            return;
        }

        if (timeSlots.some((slot) => !slot.startTime || !slot.endTime)) {
            alert('Please fill all time slots with valid start and end times.');
            return;
        }

        const newTimeTable: TimeTable = {
            name: timeTableName,
            days: [],
            timeSlots,
        };

        setProductionTarget({
            ...productionTarget,
            timeTables: [...productionTarget.timeTables, newTimeTable],
        });

        closeModal();
    };

    const handleSubmit = () => {
        if (Object.values(basicInfo).some((value) => value === '')) {
            alert('Please fill all basic information fields.');
            return;
        }

        if (productionTarget.timeTables.length === 0) {
            alert('Please add at least one Time Table.');
            return;
        }

        navigate('/dashboard');
    };

    return (
        <div className="linesetup-container">
            <h1>Production Line Setup</h1>
            {step === 1 && (
                <div className="step">
                    <h2>Step 1: Basic Information</h2>
                    <form>
                        {/* Input fields for basic information */}
                        <label>
                            Line Name:
                            <input
                                type="text"
                                name="lineName"
                                value={basicInfo.lineName}
                                onChange={handleBasicInfoChange}
                                required
                            />
                        </label>
                        <label>
                            Product Name:
                            <input
                                type="text"
                                name="productName"
                                value={basicInfo.productName}
                                onChange={handleBasicInfoChange}
                                required
                            />
                        </label>
                        {/* Other form fields */}
                    </form>
                    <button onClick={() => setStep(2)}>Next</button>
                </div>
            )}
            {step === 2 && (
                <div className="step">
                    <h2>Step 2: Production Target</h2>
                    <form>
                        <fieldset>
                            <legend>Create Time Tables:</legend>
                            <button type="button" onClick={openModal}>
                                Create Your Own Timetable
                            </button>
                            <button type="button" onClick={setDefaultTimeTable}>
                                Use Default Timetable
                            </button>
                            <div className="timetable-display-container">
                                {productionTarget.timeTables.map((tt: TimeTable, idx: number) => (
                                    <div key={idx} className="timetable-display">
                                        <h4>{tt.name}</h4>
                                        <p>Time Slots:</p>
                                        <table className="timetable-table">
                                            <thead>
                                            <tr>
                                                <th>Slot</th>
                                                <th>Start Time</th>
                                                <th>End Time</th>
                                                <th>Break</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {tt.timeSlots.map((slot: TimeSlot, sIdx: number) => (
                                                <tr key={sIdx}>
                                                    <td>{slot.id}</td>
                                                    <td>{slot.startTime}</td>
                                                    <td>{slot.endTime}</td>
                                                    <td>
                                                        {slot.break
                                                            ? `${slot.break.type} (${slot.break.duration} min)`
                                                            : 'None'}
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))}
                            </div>
                        </fieldset>
                    </form>
                    <div className="navigation-buttons">
                        <button onClick={() => setStep(1)}>Back</button>
                        <button onClick={handleSubmit}>Confirm Setup</button>
                    </div>
                </div>
            )}

            {/* Timetable Creation Modal */}
            <Modal
                isOpen={isModalOpen}
                onRequestClose={closeModal}
                contentLabel="Create Timetable"
                className="modal"
                overlayClassName="overlay"
            >
                <h2>Create Timetable</h2>
                <form>
                    <label>
                        Timetable Name:
                        <input
                            type="text"
                            value={timeTableName}
                            onChange={handleTimeTableNameChange}
                            required
                        />
                    </label>
                    <div className="time-slots">
                        <h4>Time Slots:</h4>
                        <table className="timetable-table">
                            <thead>
                            <tr>
                                <th style={{ width: '10%' }}>Slot</th>
                                <th style={{ width: '25%' }}>Start Time</th>
                                <th style={{ width: '25%' }}>End Time</th>
                                <th style={{ width: '10%' }}>Tea Break</th>
                                <th style={{ width: '10%' }}>Lunch Break</th>
                            </tr>
                            </thead>
                            <tbody>
                            {timeSlots.map((slot) => (
                                <tr key={slot.id}>
                                    <td>{slot.id}</td>
                                    <td>
                                        <input
                                            type="time"
                                            value={slot.startTime}
                                            onChange={(e) =>
                                                handleTimeSlotChange(slot.id, 'startTime', e.target.value)
                                            }
                                            required
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="time"
                                            value={slot.endTime}
                                            onChange={(e) =>
                                                handleTimeSlotChange(slot.id, 'endTime', e.target.value)
                                            }
                                            required
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={slot.break?.type === 'Tea'}
                                            onChange={() => handleTimeSlotChange(slot.id, 'break', 'Tea')}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={slot.break?.type === 'Lunch'}
                                            onChange={() => handleTimeSlotChange(slot.id, 'break', 'Lunch')}
                                        />
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="modal-buttons">
                        <button type="button" onClick={saveTimeTable}>
                            Save
                        </button>
                        <button type="button" onClick={closeModal}>
                            Cancel
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default LineSetup;