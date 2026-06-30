"use client";
import FocusTrap from 'focus-trap-react';
import { useEffect, useState } from "react";
import { CATEGORY_MAP } from "../constants/categories";
import { getLocalISOString } from "../utils/date";
import { checkActivityOverlap, toMinutes } from "../utils/overlap";
import SearchLocationBar  from "../components/SearchLocationBar";
import TimePicker from "../components/TimePicker";
import TextField from "../components/TextField";

export default function AddActivityModal({
    onClose,
    onAddActivity,
    tripStart,
    tripEnd,
    fixedDate,
    initialTime,
    existingActivities =[],
    destination = ""
}){
    const [timeError, setTimeError] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);
    //default form value
    const [formData, setFormData] = useState({
        title: "",
        date: fixedDate ? getLocalISOString(fixedDate) : (tripStart ? getLocalISOString(tripStart) : ""),
        startTime: "09:00",
        endTime: "10:00",
        startHour: "09",
        startMin: "00",
        endHour: "10",
        endMin: "00",
        address: "",
        category: "sightseeing",
        memo: "",
        lat: null,
        lon: null,
    });


    const handleLocationSelect = (location) =>{
        setFormData({
            ...formData,
            address: location.display_name,
            lat: parseFloat(location.lat),
            lon: parseFloat(location.lon)
        })
    }
    // 1. Unified Time Change Logic
    const handleTimeUpdate = (field, value) => {
        const updatedData = { ...formData, [field]: value };
        setFormData(updatedData);

        const newStartTime = `${updatedData.startHour}:${updatedData.startMin}`;
        const newEndTime = `${updatedData.endHour}:${updatedData.endMin}`;

        const startTotal = toMinutes(newStartTime);
        const endTotal = toMinutes(newEndTime);

        if(endTotal <= startTotal){
            setTimeError("End time must be after the start time!");
        } else{
            const overlappingActivity = checkActivityOverlap(existingActivities, newStartTime, newEndTime, updatedData.date);

            if (overlappingActivity) {
                setTimeError(`You already have an activity: "${overlappingActivity.title}" from ${overlappingActivity.startTime} to ${overlappingActivity.endTime}`);
            } else {
                setTimeError("");
            }
        }
    };

    // 2. Form Submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (timeError || isSubmitting ) return;

        setIsSubmitting(true);

        // Construct the final object
        const finalData = {
            title: formData.title,
            date: formData.date,
            startTime: `${formData.startHour}:${formData.startMin}`,
            endTime: `${formData.endHour}:${formData.endMin}`,
            address: formData.address,
            category: formData.category,
            memo: formData.memo,
            lat: formData.lat ? Number(formData.lat) : null,
            lon: formData.lon ? Number(formData.lon) : null,
        };

        try{
            await onAddActivity(finalData);
            onClose();
        } catch (error){
            setIsSubmitting(false);
        }
    };


    //handle the category button
    const handleCategoryChange = (categoryName) => {
        setFormData({...formData, category: categoryName});
    };


    // to prevent background scroll
    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;

        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = originalStyle || "unset";
        };
    }, []);

    // "adjust state when props change" pattern (render-time, not effect) —
    // applies the cell-click prefill without a setState-in-effect
    const [prevInitialTime, setPrevInitialTime] = useState(null);
    if (initialTime !== prevInitialTime) {
        setPrevInitialTime(initialTime);
        if (initialTime) {
            setFormData(prev => ({
                ...prev,
                date: initialTime.date,
                startHour: initialTime.startHour,
                startMin: initialTime.startMin,
                endHour: initialTime.endHour,
                endMin: initialTime.endMin,
                startTime: `${initialTime.startHour}:${initialTime.startMin}`,
                endTime: `${initialTime.endHour}:${initialTime.endMin}`
            }));
        }
    }

    return(
// escapeDeactivates:false + a manual Escape handler (onKeyDown below) so the
// modal closes via onClose without focus-trap's own Escape handling
<FocusTrap focusTrapOptions={{ escapeDeactivates: false, initialFocus: '#activity-title' }}>
    <div
        className="travel-modal-overlay"
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
        <div className="travel-modal" role="dialog" aria-modal="true" aria-labelledby="activity-modal-title" onClick={(e)=> e.stopPropagation()}>
            <div className="travel-modal__header">
                <h2 id="activity-modal-title" className="activity-modal__title">Add New Activity</h2>
                <button type="button" className="travel-modal__close" aria-label="Close modal" onClick={onClose}>✕</button>
            </div>
            <form className="travel-modal__form" onSubmit={handleSubmit}>
                <div className="travel-modal__field">
                    <TextField
                        id="activity-title"
                        label="Activity Title"
                        required
                        value={formData.title}
                        onChange={(e)=>setFormData({...formData, title:e.target.value})}
                    />
                </div>

                {/* shows only on the weekly page */}
                {!fixedDate && (
                    <div className="travel-modal__field">
                        <TextField
                            id="activity-date"
                            type="date"
                            label="Date"
                            required
                            min={getLocalISOString(tripStart)}
                            max={getLocalISOString(tripEnd)}
                            value={formData.date}
                            onChange={(e)=>setFormData({...formData, date:e.target.value})}
                        />
                    </div>
                )}

                <div className="activity-modal__time-group">
                    <div className="activity-modal__time-field">
                        <div className="travel-modal__field travel-modal__field--half">
                            <label htmlFor="activity-start-time" className="travel-modal__label">Start Time <span className="activity-modal__required">*</span></label>
                            <TimePicker
                                id="activity-start-time"
                                hour={formData.startHour}
                                minute={formData.startMin}
                                onHourChange={(v) => handleTimeUpdate('startHour', v)}
                                onMinuteChange={(v) => handleTimeUpdate('startMin', v)}
                            />
                        </div>

                        <div className="activity-modal__time-middle" aria-hidden="true">
                            <span className="activity-modal__time-middle__spacer">&nbsp;</span>
                            <span className="activity-modal__time-middle__sep">–</span>
                        </div>

                        <div className="travel-modal__field travel-modal__field--half">
                            <label htmlFor="activity-end-time" className="travel-modal__label">End Time <span className="activity-modal__required">*</span></label>
                            <TimePicker
                                id="activity-end-time"
                                hour={formData.endHour}
                                minute={formData.endMin}
                                onHourChange={(v) => handleTimeUpdate('endHour', v)}
                                onMinuteChange={(v) => handleTimeUpdate('endMin', v)}
                                min={`${formData.startHour}:${formData.startMin}`}
                                hasError={!!timeError}
                            />
                        </div>
                    </div>
                    {timeError && <p className="error-text" role="alert">{timeError}</p>}
                </div>




                <div className="travel-modal__field travel-modal__field-address">
                    <SearchLocationBar
                        inputId="activity-address"
                        label="Address"
                        onSelect={handleLocationSelect}
                        onQueryChange={() => setFormData(prev => ({ ...prev, address: "", lat: null, lon: null }))}
                        defaultValue={formData.address}
                        type="address"
                        destination={destination}
                    />
                </div>

                <div className="travel-modal__field">
                    <TextField
                        as="textarea"
                        id="activity-memo"
                        label="Memo"
                        rows="4"
                        value={formData.memo}
                        onChange={(e)=>setFormData({...formData, memo:e.target.value})}
                    />
                </div>
                <div className="travel-modal__field">
                    <label className="travel-modal__label">Category <span className="activity-modal__required">*</span></label>
                    <div className="activity-modal__category-grid " role="group" aria-label="Activity categories">

                        {Object.entries(CATEGORY_MAP).map(([key, value]) => {
                            const isActive = formData.category === key;

                            return(
                                <button type="button"
                                        key={key}
                                        aria-pressed={isActive}
                                        className={`activity-modal__category-btn ${isActive ? "is-active" : ""}`}
                                        onClick={() => handleCategoryChange(key)}
                                >
                                    <span className="activity-modal__category-emoji" aria-hidden="true">{value.emoji}</span>
                                    <span className="activity-modal__category-label">{key}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
                <div className="travel-modal__actions">
                    <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
                    <button
                        type="submit"
                        className="btn btn--primary"
                        disabled={!!timeError || !formData.title || isSubmitting}>{isSubmitting ? "Adding..." : "Add"}</button>
                </div>
            </form>
        </div>
    </div>
</FocusTrap>
    )
}
