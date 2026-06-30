"use client";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { createActivityAction, saveDayMemoAction, updateActivityAction, deleteActivityAction, updateAccommodationAction, createAccommodationAction } from "../actions/trip";

import ActivityCard from "../components/ActivityCard";
import AddActivityModal from "../components/AddActivityModal";
import ActivityDetailModal from "./ActivityDetailModal";
import ConfirmModal from "./ConfirmModal";
import { useToast } from "./ToastProvider";
import Link from "next/link";
import { format, parseISO } from "date-fns";

const Map = dynamic(() => import("./MapPanel"), {
    ssr: false,
    loading: () => <div className="map-skeleton" aria-label="Loading map..." />
})

export default function DaySchedule({
    trip,
    activities: initialActivities,
    accommodations: initialAccommodations = [] ,
    date,
    allDates,
    dayMemo:initialDayMemo,
    isGuest = false,
}){
    const showToast = useToast();
    const router = useRouter();
    const resolvedWeeklyHref = isGuest ? "/trips/guest/weekly" : `/trips/${trip?.id}/weekly`;
    const [confirmDialog, setConfirmDialog] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activities, setActivities] = useState(() => {
        if(!initialActivities) return [];
        return [...initialActivities].sort((a, b) =>
        (a.startTime || "00:00").localeCompare(b.startTime || "00:00"));
    });

    const [ dayMemo, setDayMemo ] = useState(initialDayMemo || "");
    const [ savedMemo, setSavedMemo ] = useState(initialDayMemo || "");
    const [ isSaving, setIsSaving ] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [accommodations, setAccommodations] = useState(initialAccommodations);
    
    const [focusedId, setFocusedId] = useState(null);
    const [hoveredActivityId, setHoveredActivityId] = useState(null);

    // Re-sync local state when the route/day or server data changes
    useEffect(() =>{
        if(initialActivities){
            const sorted = [...initialActivities].sort((a, b)=>
            (a.startTime || "00:00").localeCompare(b.startTime || "00:00")
        );
            setActivities(sorted);
        }
            setAccommodations(initialAccommodations || []);
            setDayMemo(initialDayMemo || "");
            setSavedMemo(initialDayMemo || "");
    }, [initialActivities, initialAccommodations, initialDayMemo, date]);

    const handleFocusOnMap = (activityId) => {
        setFocusedId(prev => prev === activityId ? null : activityId);
    };

    const dayIndex = allDates.indexOf(date);
    const previousDay = dayIndex > 0 ? allDates[dayIndex - 1] : null;
    const nextDay = dayIndex < allDates.length - 1 ? allDates[dayIndex + 1] : null;


    const markers = useMemo(() => {
        // Number pins by position in the time-sorted list so the map shows the day's route
        const activityMarkers = (activities || [])
            .map((act, index) => ({ act, order: index + 1 }))
            .filter(({ act }) => act.lat && act.lon)
            .map(({ act, order }) => ({
                id: act.id,
                type: 'activity',
                category: act.category,
                position: { lat: parseFloat(act.lat), lng: parseFloat(act.lon) },
                title: act.title,
                order
        }));

        const currentViewDate = new Date(date);

        const accommodationMarkers = (accommodations || [])
            .filter(acc => {
                if (!acc.lat || !acc.lon) return false;
                const start = new Date(acc.checkinDate);
                const end = new Date(acc.checkoutDate);
                // Display if: checkin <= current date <= checkout
                return currentViewDate >= start && currentViewDate <= end;
            })
            .map(acc => ({
                id: acc.id,
                type: 'accommodation',
                position: { lat: parseFloat(acc.lat), lng: parseFloat(acc.lon) },
                title: acc.title
            }));

            return [...activityMarkers, ...accommodationMarkers];
        }, [activities, accommodations, date]);

    if (!trip || !trip.destination) {
        return (
            <main className="page-loading">
                <div>Loading trip data...</div>
            </main>
        );
    }

    const syncGuestStorage = (updatedActivities, updatedMemo = dayMemo, updatedAccoms = accommodations) => {
        const saved = localStorage.getItem("temp_trip");
        if (saved) {
            const tripData = JSON.parse(saved);

            tripData.accommodations = updatedAccoms;

            if(!tripData.daysData) tripData.daysData = [];

            // Update the specific day's data
            let dayIdx = tripData.daysData.findIndex(d => d.date === date);

            if (dayIdx !== -1) {
                tripData.daysData[dayIdx].activities = updatedActivities;
                tripData.daysData[dayIdx].memo = updatedMemo;
            } else{
                tripData.daysData.push({
                    date: date,
                    activities: updatedActivities,
                    memo: updatedMemo
                });
            }
            localStorage.setItem("temp_trip", JSON.stringify(tripData));
        }
    };

    const handleAddAccommodation = async (newAcc) => {
        const tempId = crypto.randomUUID();
        const accWithId = { ...newAcc, id: tempId };
        const updated = [...accommodations, accWithId];

        setAccommodations(updated);

        if(isGuest) {
            syncGuestStorage(activities, dayMemo, updated);
            showToast("Accommodation added!", "success");
        } else {
            try {
                const result = await createAccommodationAction(trip.id, newAcc);
                if (result?.success && result.id) {
                    setAccommodations(prev =>
                        prev.map(a => a.id === tempId ? { ...a, id: String(result.id) } : a)
                    );
                    showToast("Accommodation added!", "success");
                } else {
                    setAccommodations(prev => prev.filter(a => a.id !== tempId));
                    showToast(result?.error || "Could not save accommodation.", "error");
                }
            } catch(error) {
                setAccommodations(prev => prev.filter(a => a.id !== tempId));
                showToast("Could not save accommodation.", "error");
            }
        }
    };

    const handleAddActivity = async (newActivity) => {
        const tempId = crypto.randomUUID();
        const activityWithId = { ...newActivity, id: tempId };

        const updated = [...activities, activityWithId].sort((a, b)=>
            (a.startTime || "00:00").localeCompare(b.startTime || "00:00")
        );

        setActivities(updated);

        if(isGuest){
            syncGuestStorage(updated);
            showToast("Activity added!", "success");
        } else{
            try {
                const result = await createActivityAction(trip.id, newActivity);
                if (result?.success && result.id) {
                    setActivities(prev =>
                        prev.map(a => a.id === tempId ? { ...a, id: String(result.id) } : a)
                    );
                    showToast("Activity added!", "success");
                } else {
                    setActivities(prev => prev.filter(a => a.id !== tempId));
                    showToast(result?.error || "Could not save activity.", "error");
                }
            } catch(error){
                setActivities(prev => prev.filter(a => a.id !== tempId));
                showToast("Could not save activity. Please try again.", "error");
            }
        }
    };

    const handleMemoChange = (e) => {
        setDayMemo(e.target.value);
    };

    // save memo into database
    const handleSaveMemo = async () => {
        if (dayMemo === savedMemo) return; // nothing changed, no save/toast

        setIsSaving(true);
        if(isGuest){
            syncGuestStorage(activities, dayMemo);
            setSavedMemo(dayMemo);
            setIsSaving(false);
            showToast("Memo saved.", "success");
        } else{
            try {
                const result = await saveDayMemoAction(trip.id, date, dayMemo);
                if (result?.success) {
                    setSavedMemo(dayMemo);
                    showToast("Memo saved.", "success");
                } else {
                    showToast(result?.error || "Failed to save memo.", "error");
                }
            } catch (error) {
                showToast("Failed to save memo.", "error");
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleUpdateActivity = async (updatedActivity) => {
        const snapshot = activities;

        // Compute and apply optimistic update
        let finalActivities;
        if (updatedActivity.date !== date) {
            finalActivities = activities.filter(act => act.id !== updatedActivity.id);
        } else {
            finalActivities = activities
                .map(act => act.id === updatedActivity.id ? updatedActivity : act)
                .sort((a, b) => (a.startTime || "00:00").localeCompare(b.startTime || "00:00"));
        }

        if (isGuest) syncGuestStorage(finalActivities);
        setActivities(finalActivities);
        setSelectedActivity(null);

        if (!isGuest) {
            try {
                const result = await updateActivityAction(trip.id, updatedActivity);
                if (result?.success) {
                    showToast("Changes saved.", "success");
                } else {
                    setActivities(snapshot);
                    showToast(result?.error || "Failed to update activity.", "error");
                }
            } catch (error) {
                setActivities(snapshot);
                showToast("Failed to update activity.", "error");
            }
        } else {
            showToast("Changes saved.", "success");
        }
    };


    const handleDeleteActivity = (activityId) => {
        setConfirmDialog({
            message: "Are you sure you want to delete this activity?",
            onConfirm: async () => {
                setConfirmDialog(null);
                const updated = activities.filter((act) => act.id !== activityId);
                setActivities(updated);
                if (selectedActivity?.id === activityId) setSelectedActivity(null);
                if(isGuest){
                    syncGuestStorage(updated);
                    showToast("Activity deleted.", "success");
                } else{
                    try{
                        const result = await deleteActivityAction(trip.id, activityId);
                        if(result?.success){
                            showToast("Activity deleted.", "success");
                        } else {
                            showToast(result?.error || "Could not delete activity from server.", "error");
                        }
                    } catch(error){
                        showToast("Could not delete activity from server.", "error");
                    }
                }
            }
        });
    }


    return(
        <main>
            <section className="day-schedule">
                <header className="day-schedule__header">
                    <h1 className="day-schedule__destination">{trip.destination.toUpperCase()}</h1>
                    <select
                        id="day-jump"
                        name="day-jump"
                        className="day-jump"
                        value={date}
                        aria-label="Jump to day"
                        onChange={(e) => router.push(`${resolvedWeeklyHref}/${e.target.value}`)}
                    >
                        {allDates.map((d, index) => (
                            <option key={d} value={d}>
                                {`Day ${index + 1}`} — {format(parseISO(d), "EEE, MMM d")}
                            </option>
                        ))}
                    </select>
                    <div className="day-schedule__header-actions">
                        {previousDay ? (
                            <Link href={`${resolvedWeeklyHref}/${previousDay}`}
                                className="btn btn--sm btn--secondary">
                                <span>
                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true">
                                        <path d="M400-240 160-480l240-240 56 58-142 142h486v80H314l142 142-56 58Z"/>
                                    </svg>
                                </span>
                                Previous day
                            </Link>
                        ) : (
                            <span className="btn btn--sm btn--secondary btn--disable" aria-disabled="true">
                                <span>
                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true">
                                        <path d="M400-240 160-480l240-240 56 58-142 142h486v80H314l142 142-56 58Z"/>
                                    </svg>
                                </span>
                                Previous day
                            </span>
                        )}
                        {nextDay ? (
                            <Link href={`${resolvedWeeklyHref}/${nextDay}`}
                                className="btn btn--sm btn--secondary">
                                Next day
                                <span>
                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true">
                                        <path d="m560-240-56-58 142-142H160v-80h486L504-662l56-58 240 240-240 240Z"/>
                                    </svg>
                                </span>
                            </Link>
                        ) : (
                            <span className="btn btn--sm btn--secondary btn--disable" aria-disabled="true">
                                Next day
                                <span>
                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true">
                                        <path d="m560-240-56-58 142-142H160v-80h486L504-662l56-58 240 240-240 240Z"/>
                                    </svg>
                                </span>
                            </span>
                        )}
                    </div>

                </header>
                <div className="day-schedule__contents">
                    <div className="day-list">
                        <header className="day-list__header">
                            <h3 className="day-list__title">{`Day ${dayIndex + 1}`}  <span> {format(parseISO(date), "EEE, MMM d, yyyy")} </span></h3>
                            <button className="btn btn--sm btn--secondary" type="button" aria-label="Add activity" onClick={() => setIsModalOpen(true)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor" aria-hidden="true"><path d="M444-444H240v-72h204v-204h72v204h204v72H516v204h-72v-204Z"/></svg>
                                    <span className="day-list__add-label">Add activity</span>
                                </button>
                        </header>
                        <div className="day-list__content">
                            {activities.length > 0 ? (
                                activities.map(act => (
                                    <div key={act.id} className="day-list__item">
                                        <ActivityCard
                                            activity={act}
                                            onMouseEnter={() => setHoveredActivityId(act.id)}
                                            onMouseLeave={() => setHoveredActivityId(null)}
                                            onFocusOnMap={() => handleFocusOnMap(act.id)}
                                            onShowDetails={setSelectedActivity}
                                            onDelete={() => handleDeleteActivity(act.id)}
                                            isActive={hoveredActivityId === act.id}
                                        />
                                    </div>
                                ))
                            ) : (
                                <div className="empty-state">
                                    <svg xmlns="http://www.w3.org/2000/svg" height="36px" viewBox="0 -960 960 960" width="36px" fill="currentColor" aria-hidden="true">
                                        <path d="M580-240q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29ZM200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Z"/>
                                    </svg>
                                    <p>No activities planned yet.</p>
                                    <button
                                            type="button"
                                            className="btn btn--primary btn--sm"
                                            onClick={() => setIsModalOpen(true)}
                                        >
                                            + Add your first activity
                                        </button>
                                </div>
                            )}
                        </div>            
                    </div>
                    <div className="right-panel">
                        <div className="map-wrapper">
                            <Map
                                markers={markers}
                                activeId={hoveredActivityId}
                                focusedId={focusedId}
                                destination={trip.destination}
                            />
                        </div>
                    </div>
                </div>
                <div>
                    <div className="bottom-panel">
                        <label htmlFor="day-memo">
                            Daily Memo
                            {isSaving && <span className="memo-saving" aria-live="polite"> Saving...</span>}
                        </label>
                        <textarea
                            id="day-memo"
                            className="note"
                            name="dayMemo"
                            value={dayMemo}
                            onBlur={handleSaveMemo}
                            onChange={handleMemoChange}
                            placeholder="Memo"
                            rows={4}
                            cols={40}
                        />

                    </div>
                </div>

                {isModalOpen && (
                    <AddActivityModal
                        onClose={() => setIsModalOpen(false)}
                        onAddActivity={handleAddActivity}
                        fixedDate={date}
                        tripStart={trip.startDate}
                        tripEnd={trip.endDate}
                        existingActivities={activities}
                        destination={trip.destination}
                    />
                )}

                {selectedActivity && (
                    <ActivityDetailModal
                        activity={selectedActivity}
                        onClose={() => setSelectedActivity(null)}
                        onUpdateActivity={handleUpdateActivity}
                        onDelete={() => handleDeleteActivity(selectedActivity.id)}
                        onShowDetails={setSelectedActivity}
                        tripStart={trip.startDate}
                        tripEnd={trip.endDate}
                        category={selectedActivity.category}
                        existingActivities={activities}
                    />
                )}

                {confirmDialog && (
                    <ConfirmModal
                        message={confirmDialog.message}
                        onConfirm={confirmDialog.onConfirm}
                        onCancel={() => setConfirmDialog(null)}
                    />
                )}
            </section>
        </main>
    )
}