"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { createActivityAction, updateActivityAction , deleteActivityAction, createAccommodationAction, updateAccommodationAction, deleteAccommodationAction} from "../actions/trip";
import AddActivityModal from "../components/AddActivityModal";
import ActivityDetailModal from "./ActivityDetailModal";
import AddAccommodationModal from "./AddAccommodationModal";
import AccommodationTimelineBar from "./AccommodationTimelineBar";
import AccommodationDetailModal from "./AccommodationDetailModal";
import ConfirmModal from "./ConfirmModal";
import { CATEGORY_MAP } from "../constants/categories";
import { checkActivityOverlap } from "../utils/overlap";
import { useToast } from "./ToastProvider";
import Link from "next/link";
import { format, parseISO } from "date-fns";

import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
    const h = String(Math.floor(i / 2)).padStart(2, "0");
    const m = i % 2 === 0 ? "00" : "30";
    return { index: i, label: `${h}:${m}`, isHourMark: i % 2 === 0 };
});

// make each cell a droppable target
function DroppableCell({id, children, onClick}){
    const { setNodeRef } = useDroppable({ id });
    return(
        <td ref={setNodeRef} className="weekly__cell" onClick={onClick}>
            <div className="weekly__cell-content">
                {children}
            </div>
        </td>        
    )
}

// make an activity chip draggable
function Draggable({activity, onClick, calculateSpan}){
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: activity.id,
        data: activity,
    });

    const categoryStyle = CATEGORY_MAP[activity.category] || { bg: "#eee", border: "#ccc", emoji: "📍" };
    const span = calculateSpan(activity.startTime, activity.endTime);

    const style = {
        backgroundColor: categoryStyle.bg,
        border: `1px solid ${categoryStyle.color}`,
        height: `${span * 40 - 2}px`,
        opacity: isDragging ? 0.3 : 1,
        position: 'absolute',
        width: '100%',
    };

    return(
        <button
            ref={setNodeRef}
            style={style}
            className="chip chip--absolute"
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            {...listeners}
            {...attributes}
        >
            <span className="chip__emoji">{categoryStyle.emoji}</span>
            <div className="chip__head">
                <span className="chip__title">{activity.title}</span>
                <span className="chip__time">{activity.startTime}-{activity.endTime}</span>
            </div>
        </button>
    );
}

function DragOverlayCard({ activity, calculateSpan }) {
    const categoryStyle = CATEGORY_MAP[activity.category] || { bg: "#eee", border: "#ccc", emoji: "📍" };
    const span = calculateSpan(activity.startTime, activity.endTime);

    return (
        <button
            style={{
                backgroundColor: categoryStyle.bg,
                border: `1px solid ${categoryStyle.color}`,
                height: `${span * 40 - 2}px`,
                width: '100%',
                opacity: 0.9,
                cursor: 'grabbing',
            }}
            className="chip"
        >
            <span className="chip__emoji">{categoryStyle.emoji}</span>
            <div className="chip__head">
                <span className="chip__title">{activity.title}</span>
                <span className="chip__time">{activity.startTime}-{activity.endTime}</span>
            </div>
        </button>
    );
}

export default function WeeklyTable({tripId, destination, startDate, endDate, daysData = [], accommodations = [], isGuest = false}){
    const showToast = useToast();
    const weeklyHref = isGuest ? "/trips/guest/weekly" : `/trips/${tripId}/weekly`;
    const [confirmDialog, setConfirmDialog] = useState(null);
    const today = format(new Date(), "yyyy-MM-dd");

    const [allDates, setAllDates] = useState(daysData);
    const [localAccommodations, setLocalAccommodations] = useState(accommodations);

    useEffect(() => {
        setAllDates(daysData);
    }, [daysData]);

    useEffect(() => {
        setLocalAccommodations(accommodations);
    }, [accommodations]);

    //AddActivityModal
    const [isModalOpen, setIsModalOpen] = useState(false);

    //Open AddAccommodationModal
    const [isAccommodationModal, setIsAccommodationModal] = useState(false);
    
    //Open AccommodationDetailModal
    const [selectedAccommodation, setSelectedAccommodation] = useState(null);

    //Open activityDetailModal
    const [selectedActivity, setSelectedActivity] = useState(null);

    // sensors for DnD — KeyboardSensor lets keyboard users grab a chip with
    // Space/Enter and move it with the arrow keys
    const sensors = useSensors(
        useSensor(PointerSensor, {activationConstraint: {distance : 5}}),
        useSensor(KeyboardSensor)
    );

    const [activeActivity, setActiveActivity] = useState(null);

    function handleDragStart(event) {
        setActiveActivity(event.active.data.current);
    }

    // On first render, scroll to the earliest activity (or 07:00) instead of midnight
    const scrollRef = useRef(null);
    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;

        let earliestSlot = Infinity;
        for (const day of daysData) {
            for (const activity of (day.activities || [])) {
                if (!activity.startTime) continue;
                const [h, m] = activity.startTime.split(':').map(Number);
                earliestSlot = Math.min(earliestSlot, h * 2 + (m >= 30 ? 1 : 0));
            }
        }
        const targetSlot = earliestSlot === Infinity ? 14 : Math.max(earliestSlot - 1, 0); // 14 = 07:00

        const rows = container.querySelectorAll(".weekly__row");
        const thead = container.querySelector("thead");
        const row = rows[targetSlot];
        if (row) {
            container.scrollTop = row.offsetTop - (thead ? thead.offsetHeight : 0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // calculate how many slots for the cell height
    const calculateSpan = (start, end) => {
        const [h1, m1] = start.split(':').map(Number);
        const [h2, m2] = end.split(':').map(Number);
        const totalMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
        return Math.max(1, Math.ceil(totalMinutes / 30)); // Minimum 1 slot
    };

    const activitySlotMap = useMemo(() => {
        const map = new Map();
        for (const day of allDates) {
            const slotMap = new Map();
            for (const activity of (day.activities || [])) {
                let slot;
                if (activity.timeSlot !== undefined) {
                    slot = activity.timeSlot;
                } else if (activity.startTime) {
                    const [h, m] = activity.startTime.split(':').map(Number);
                    slot = h * 2 + (m >= 30 ? 1 : 0);
                } else {
                    continue;
                }
                if (!slotMap.has(slot)) slotMap.set(slot, []);
                slotMap.get(slot).push(activity);
            }
            map.set(day.date, slotMap);
        }
        return map;
    }, [allDates]);


    const allActivities = useMemo(() => allDates.flatMap(day => day.activities || []), [allDates]);

    // Save an activity (create / update / drag) optimistically, rolling back on failure.
    const handleSaveActivity = async (activityData, offerUndo = true) => {
        const dayIndex = allDates.findIndex(d => d.date === activityData.date);
        if (dayIndex === -1) return;

        // Server re-checks on save; this is the instant UX guard (shared logic).
        const overlappingActivity = checkActivityOverlap(
            allActivities,
            activityData.startTime,
            activityData.endTime,
            activityData.date,
            activityData.id
        );

        if(overlappingActivity){
            showToast(
                `Overlaps with "${overlappingActivity.title}" (${overlappingActivity.startTime}–${overlappingActivity.endTime}) — changes were not saved.`,
                "error"
            );
            return;
        }
        const isUpdate = !!activityData.id;

        // keep the pre-change values so the success toast can offer Undo
        const originalActivity = isUpdate
            ? allDates.flatMap(d => d.activities || []).find(a => a.id === activityData.id)
            : null;
        const undoAction = (offerUndo && originalActivity)
            ? { label: "Undo", onClick: () => handleSaveActivity({ ...originalActivity }, false) }
            : undefined;

        const [h, m] = activityData.startTime.split(':').map(Number);
        const calculatedSlot = h * 2 + (m >= 30 ? 1 : 0);

        const tempId = isUpdate ? activityData.id : crypto.randomUUID();
        const finalActivity = {
            ...activityData,
            id: tempId,
            timeSlot: calculatedSlot
        };

        const snapshot = allDates;

        const updatedDays = allDates.map(day => {
            const cleanActivities = (day.activities || []).filter(act => act.id !== finalActivity.id);
            if(day.date === finalActivity.date){
                return{ ...day, activities: [...cleanActivities, finalActivity]};
            }

            return{...day, activities: cleanActivities};
        });

        setAllDates(updatedDays);

        if(!isGuest){
            try {
                if (isUpdate) {
                    const result = await updateActivityAction(tripId, activityData);
                    if(result?.success){
                        showToast(offerUndo ? "Saved." : "Restored.", "success", undefined, undoAction);
                    } else {
                        setAllDates(snapshot);
                        showToast(result?.error || "Failed to save activity.", "error");
                    }
                } else {
                    const result = await createActivityAction(tripId, activityData);
                    if (result?.success && result.id) {
                        setAllDates(prev => prev.map(day => ({
                            ...day,
                            activities: (day.activities || []).map(a =>
                                a.id === tempId ? { ...a, id: String(result.id) } : a
                            )
                        })));
                        showToast("Activity added!", "success");
                    } else {
                        setAllDates(prev => prev.map(day => ({
                            ...day,
                            activities: (day.activities || []).filter(a => a.id !== tempId)
                        })));
                        showToast(result?.error || "Failed to sync with database.", "error");
                    }
                }
            } catch (error) {
                setAllDates(snapshot);
                showToast("Failed to sync with database.", "error");
            }
        } else{
            const savedTrip = JSON.parse(localStorage.getItem("temp_trip") || "{}");
            savedTrip.daysData = updatedDays;
            localStorage.setItem("temp_trip", JSON.stringify(savedTrip));
            showToast(
                isUpdate ? (offerUndo ? "Saved." : "Restored.") : "Activity added!",
                "success",
                undefined,
                undoAction
            );
        }

        setIsModalOpen(false);      // Close Add Modal
        setIsAccommodationModal(false);
        setSelectedActivity(null);  // Close Detail Modal


    };

    const handleDeleteActivity = (activityId, date) => {
        setConfirmDialog({
            message: "Are you sure you want to delete this activity?",
            onConfirm: async () => {
                setConfirmDialog(null);
                setAllDates(prev => {
                    const updated = prev.map(day =>
                        day.date === date
                            ? { ...day, activities: day.activities.filter(a => a.id !== activityId) }
                            : day
                    );
                    if(isGuest){
                        const savedTrip = JSON.parse(localStorage.getItem("temp_trip") || "{}");
                        savedTrip.daysData = updated;
                        localStorage.setItem("temp_trip", JSON.stringify(savedTrip));
                    }
                    return updated;
                });
                if(!isGuest){
                    try{
                        const result = await deleteActivityAction(tripId, activityId);
                        if(result?.success){
                            showToast("Activity deleted.", "success");
                        } else {
                            showToast(result?.error || "Could not delete activity from server.", "error");
                        }
                    } catch(error){
                        showToast("Could not delete activity from server.", "error");
                    }
                } else {
                    showToast("Activity deleted.", "success");
                }
                setSelectedActivity(null);
            }
        });
    };

    //For when user clicked the cell, set the dafalt value of start time as the time slot, and date, set to the same day as the cell
    const [preFillDate, setPreFillDate] = useState(null);

    const handleCellClick = (dayDate, slotLabel) =>{
        const [hour, minute] = slotLabel.split(":");

        const endH = String(Math.floor((parseInt(hour)*60 + parseInt(minute) + 60) / 60)).padStart(2, "0");
        const endM = minute;

        // Clamp to 23:30 so the prefill stays on the 30-minute grid
        setPreFillDate({
            date: dayDate,
            startHour: hour,
            startMin: minute,
            endHour: endH === '24' ? "23" : endH,
            endMin: endH === "24" ? "30" : endM
        });
        setIsModalOpen(true);
    };

    // after the drag
    function handleDragEnd(event){
        setActiveActivity(null);
        const { active, over } = event;
        if (!over) return;

        let targetId = over.id;
        if(!targetId.startsWith('cell:')){
            return;
        }

        // Extract info from drop target ID (e.g., "cell:2026-02-05:18")
        const [, newDate, slotIndexStr] = over.id.split(':');
        const newSlotIndex = parseInt(slotIndexStr);
        const originalActivity = active.data.current;

        // Calculate new Start Time
        const h = String(Math.floor(newSlotIndex / 2)).padStart(2, "0");
        const m = newSlotIndex % 2 === 0 ? "00" : "30";
        
        const [sh, sm] = originalActivity.startTime.split(':').map(Number);
        const [eh, em] = originalActivity.endTime.split(':').map(Number);
        const duration = (eh * 60 + em) - (sh * 60 + sm);

        const newStartTotal = (parseInt(h) * 60) + parseInt(m);
        const rawEndTotal = newStartTotal + duration;
        // Clamp to 23:30 so the dragged activity stays on the 30-minute grid
        const newEndTotal = Math.min(rawEndTotal, 23 * 60 + 30);

        handleSaveActivity({
            ...originalActivity,
            date: newDate,
            startTime: `${h}:${m}`,
            endTime: `${String(Math.floor(newEndTotal / 60)).padStart(2, "0")}:${String(newEndTotal % 60).padStart(2, "0")}`,
        });
    }

    const handleSaveAccommodation = async (accData) => {
    const tempId = crypto.randomUUID();
    const optimisticAcc = { ...accData, id: tempId };
    const updatedAccommodations = [...localAccommodations, optimisticAcc];

    setLocalAccommodations(updatedAccommodations);
    setIsAccommodationModal(false);

    if (!isGuest) {
        try {
            const result = await createAccommodationAction(tripId, accData);
            if (result?.success && result.id) {
                setLocalAccommodations(prev =>
                    prev.map(a => a.id === tempId ? { ...a, id: String(result.id) } : a)
                );
                showToast("Accommodation added!", "success");
            } else {
                setLocalAccommodations(prev => prev.filter(a => a.id !== tempId));
                showToast(result?.error || "Failed to save accommodation.", "error");
            }
        } catch (error) {
            setLocalAccommodations(prev => prev.filter(a => a.id !== tempId));
            showToast("Failed to save accommodation.", "error");
        }
    } else {
        const savedTrip = JSON.parse(localStorage.getItem("temp_trip") || "{}");
        savedTrip.accommodations = updatedAccommodations;
        localStorage.setItem("temp_trip", JSON.stringify(savedTrip));
        showToast("Accommodation added!", "success");
    }

    };

    const handleUpdateAccommodation = async(updatedData) => {
        const updatedAccommodations = localAccommodations.map(acc =>
            (acc && acc.id === updatedData.id) ? updatedData : acc
        );
        setLocalAccommodations(updatedAccommodations);
        setSelectedAccommodation(null);

        if (!isGuest) {
            try{
                const result = await updateAccommodationAction(tripId, updatedData);
                if (result?.success) {
                    showToast("Changes saved.", "success");
                } else {
                    showToast(result?.error || "Failed to update accommodation.", "error");
                }
            } catch(error){
                showToast("Failed to update database.", "error");
            }
        } else {
            const savedTrip = JSON.parse(localStorage.getItem("temp_trip") || "{}");
            savedTrip.accommodations = updatedAccommodations;
            localStorage.setItem("temp_trip", JSON.stringify(savedTrip));
            showToast("Changes saved.", "success");
        }
    }

    const handleDeleteAccommodation = (accommodationId) => {
        setConfirmDialog({
            message: "Are you sure you want to delete this accommodation?",
            onConfirm: async () => {
                setConfirmDialog(null);
                setSelectedAccommodation(null);
                setLocalAccommodations(prev =>
                    prev.filter(accommodation => accommodation && accommodation.id !== accommodationId)
                );
                if(!isGuest){
                    try{
                        const result = await deleteAccommodationAction(tripId, accommodationId);
                        if(result?.success){
                            showToast("Accommodation deleted.", "success");
                        } else {
                            showToast(result?.error || "Failed to delete from database.", "error");
                        }
                    } catch(error){
                        showToast("Failed to delete from database.", "error");
                    }
                } else {
                    const savedTrip = JSON.parse(localStorage.getItem("temp_trip") || "{}");
                    savedTrip.accommodations = localAccommodations.filter(acc => acc.id !== accommodationId);
                    localStorage.setItem("temp_trip", JSON.stringify(savedTrip));
                    showToast("Accommodation deleted.", "success");
                }
            }
        });
    }

    useEffect(() => {
        if (isGuest) {
            const savedData = localStorage.getItem("temp_trip");
            if (savedData) {
                const parsed = JSON.parse(savedData);
                if (parsed.daysData) setAllDates(parsed.daysData);
                if (parsed.accommodations) setLocalAccommodations(parsed.accommodations);
            }
        }
    }, [isGuest]);

    return(
        <main>
            <DndContext
                id="weekly-dnd-context"
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="weekly">
                    <header className="weekly__header">
                        <div className="weekly__header-main">
                            <h2 className="weekly__destination">
                                {destination}
                            </h2>
                            <h3 className="weekly__date">
                                { format(parseISO(startDate), "MMM d, yyyy")} - {format(parseISO(endDate), "MMM d, yyyy")}
                            </h3>
                        </div>

                        <div className="weekly__action-btns">
                            {/* Trigger AddAccommodationModal */}
                            <button
                                className="btn btn--sm btn--tonal"
                                type="button"
                                onClick={() => setIsAccommodationModal(true)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
                                    <path d="M700-200h40v-100h100v-40H740v-100h-40v100H600v40h100v100Zm20 80q-83 0-141.5-58.5T520-320q0-83 58.5-141.5T720-520q83 0 141.5 58.5T920-320q0 83-58.5 141.5T720-120Zm-560-80v-480l320-240 320 240v92q-19-6-39-9t-41-3v-40L480-820 240-640v360h203q3 21 9 41t15 39H160Zm320-350Z"/>
                                </svg>
                                Add Accommodation
                            </button>

                            {/* Trigger AddActivityModal */}
                            <div className="fab-container">
                                <button className="btn btn--sm btn--primary add-activity-btn" type="button" onClick={()=> setIsModalOpen(true)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                                        <path d="M444-444H240v-72h204v-204h72v204h204v72H516v204h-72v-204Z"/>
                                    </svg>
                                    <span>Add activity</span>
                                </button>
                            </div>
                        </div>
                    </header>

                    <div className="weekly__inner">
                        <div className="weekly__scroll" ref={scrollRef}>
                            <table className="weekly__table">
                                <thead className="weekly__thead">
                                    <tr className="weekly__thead-row">
                                        <th className="weekly__time-header">
                                            <span className="weekly__time-header-label">
                                                Time
                                            </span>
                                        </th>
                                        {/* {map} */}
                                        {allDates.map((day, index) => (
                                            <th
                                                key={`day-${day.date}`}
                                                className={`weekly__thead weekly__day-header${day.date === today ? " is-today" : ""}`}
                                            >
                                                <Link
                                                    href={`${weeklyHref}/${day.date}`}
                                                    className="weekly__day-button"
                                                >
                                                    <span className="weekly__day-label">{`Day ${index + 1}`}</span>
                                                    <span className="weekly__day-date">{format(parseISO(day.date), "EEE M/d")}</span>
                                                </Link>
                                            </th>
                                        ))}
                                    </tr>
    
                                    {/* Accommodation Timeline */}
                                    <tr className="weekly__thead-accommodation-row">
                                        <th className="accommodation-bar-title">
                                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000">
                                                <path d="M40-200v-600h80v400h320v-320h320q66 0 113 47t47 113v360h-80v-120H120v120H40Zm155-275q-35-35-35-85t35-85q35-35 85-35t85 35q35 35 35 85t-35 85q-35 35-85 35t-85-35Zm325 75h320v-160q0-33-23.5-56.5T760-640H520v240ZM308.5-531.5Q320-543 320-560t-11.5-28.5Q297-600 280-600t-28.5 11.5Q240-577 240-560t11.5 28.5Q263-520 280-520t28.5-11.5ZM280-560Zm240-80v240-240Z"/>
                                            </svg>
                                        </th>

                                        <th colSpan={allDates.length} className="accommodation-bar-container">
                                            <div className="accommodation-bar-wrapper">
                                                {localAccommodations
                                                .filter(accommodation => accommodation && accommodation.id )
                                                .map((accommodation, index) => (
                                                        <AccommodationTimelineBar 
                                                            key={accommodation.id}
                                                            index={index}
                                                            accommodation={accommodation}
                                                            allDates={allDates.map(d => d.date)}
                                                            onOpenModal={(accommodation) => setSelectedAccommodation(accommodation)}
                                                        />   
                                                    )
                                                )}
                                            </div>
                                        </th>

                                    </tr>
                                </thead>

                                <tbody className="weekly__tbody">
                                    {/* time */}
                                    {TIME_SLOTS.map((slot)=>(
                                    <tr key={`row-${slot.index}`} className={`weekly__row${slot.isHourMark ? " weekly__row--hour" : " weekly__row--half"}`}>
                                        <td className="weekly__time-cell">
                                            <span className="weekly__time-label">{slot.label}</span>
                                        </td>

                                        {/* number of days * cell  */}
                                        {allDates.map((day)=>(
                                            <DroppableCell
                                                key={`${day.date}-${slot.index}`}
                                                id={`cell:${day.date}:${slot.index}`}
                                                onClick={() => handleCellClick(day.date, slot.label)}
                                            >

                                                {(activitySlotMap.get(day.date)?.get(slot.index) || []).map( activity =>(
                                                    <Draggable
                                                        key={activity.id}
                                                        activity={activity}
                                                        calculateSpan={calculateSpan}
                                                        onClick = {() => setSelectedActivity(activity)}
                                                    />
                                                ))}
                                            </DroppableCell>
                                        ))}
                                    </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            
                {isModalOpen && (
                    <AddActivityModal
                        onClose={() => {
                            setIsModalOpen(false);
                            setPreFillDate(null); //reset
                        }}
                        onAddActivity={handleSaveActivity}
                        tripStart={startDate}
                        tripEnd={endDate}
                        fixedDate={preFillDate?.date}
                        initialTime={preFillDate}
                        existingActivities={allActivities}
                        destination={destination}
                    />
                )}
                {isAccommodationModal && (
                    <AddAccommodationModal
                        onClose={() => setIsAccommodationModal(false)}
                        onAddAccommodation={(data) => handleSaveAccommodation(data)}
                        tripStart={startDate}
                        tripEnd={endDate}
                        allAccommodations={localAccommodations}
                        destination={destination}
                    />
                )}
                {selectedAccommodation && (
                    <AccommodationDetailModal
                        key={selectedAccommodation.id}
                        accommodation={selectedAccommodation}
                        allAccommodations={localAccommodations}
                        onClose={() => setSelectedAccommodation(null)}
                        onUpdateAccommodation={handleUpdateAccommodation}
                        onDelete={handleDeleteAccommodation}
                        tripStart={startDate}
                        tripEnd={endDate}
                    />
                )}
                <DragOverlay>
                    {activeActivity ? (
                        <DragOverlayCard
                            activity={activeActivity}
                            calculateSpan={calculateSpan}
                        />
                    ) : null}
                </DragOverlay>

                {selectedActivity && (
                    <ActivityDetailModal
                        activity={selectedActivity}
                        onClose={() => setSelectedActivity(null)}
                        onDelete={() => handleDeleteActivity(selectedActivity.id, selectedActivity.date)}
                        onUpdateActivity={handleSaveActivity}
                        tripStart={startDate}
                        tripEnd={endDate}
                        category={selectedActivity.category}
                        existingActivities={allActivities}
                    />
                )}
            </DndContext>

            {confirmDialog && (
                <ConfirmModal
                    message={confirmDialog.message}
                    onConfirm={confirmDialog.onConfirm}
                    onCancel={() => setConfirmDialog(null)}
                />
            )}
        </main>
    );
}