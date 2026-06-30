"use client"
import { useEffect, useState } from "react"
import FocusTrap from 'focus-trap-react';
import ConfirmModal from "./ConfirmModal";
import SearchLocationBar from "../components/SearchLocationBar"
import { CATEGORY_MAP } from "../constants/categories"
import TimePicker from "../components/TimePicker"
import TextField from "../components/TextField"
import { getLocalISOString } from "../utils/date"
import { checkActivityOverlap, toMinutes } from "../utils/overlap"

const buildFormData = (activity) => ({
    ...activity,
    startHour: activity.startTime?.split(':')[0] || "09",
    startMin: activity.startTime?.split(':')[1] || "00",
    endHour: activity.endTime?.split(':')[0] || "10",
    endMin: activity.endTime?.split(':')[1] || "00",
});

export default function ActivityDetailModal({
    activity,
    onClose,
    onUpdateActivity,
    onDelete,
    tripStart,
    tripEnd,
    category,
    existingActivities = [],
}){
    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeError, setTimeError] = useState("");

    const [formData, setFormData] = useState(() => buildFormData(activity));

    useEffect(() =>{
        setFormData(buildFormData(activity));
    }, [activity]);

    const isDirty = isEditing && JSON.stringify(formData) !== JSON.stringify(buildFormData(activity));
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

    const handleClose = () => {
        if (isDirty) {
            setShowDiscardConfirm(true);
            return;
        }
        onClose();
    };

    const handleCancelEdit = () => {
        setFormData(buildFormData(activity));
        setTimeError("");
        setIsEditing(false);
    };

    const handleTimeUpdate = (field, value) => {
        const updatedData = {...formData, [field]: value};

        const newStartTime = `${updatedData.startHour}:${updatedData.startMin}`;
        const newEndTime = `${updatedData.endHour}:${updatedData.endMin}`;

        const startTotal = toMinutes(newStartTime);
        const endTotal = toMinutes(newEndTime);

        if (endTotal <= startTotal) {
            setTimeError("End time must be after start time");
        } else {
            const overlappingActivity = checkActivityOverlap(
                existingActivities, newStartTime, newEndTime, updatedData.date, activity.id
            );
            if(overlappingActivity){
                setTimeError(`You already have an activity: "${overlappingActivity.title}" from ${overlappingActivity.startTime} to ${overlappingActivity.endTime}`)
            } else{
                setTimeError("");
            }
        }

        setFormData(updatedData);
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (timeError || isSubmitting) return;

        const finalData = {
            ...formData,
            startTime: `${formData.startHour}:${formData.startMin}`,
            endTime: `${formData.endHour}:${formData.endMin}`,
            lat: formData.lat ? Number(formData.lat) : null,
            lon: formData.lon ? Number(formData.lon) : null,
        };

        setIsSubmitting(true);
        try {
            await onUpdateActivity(finalData);
        } finally {
            setIsSubmitting(false);
            setIsEditing(false);
        }
    };

    // to prevent background scroll
    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;

        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = originalStyle || "unset";
        };
    }, []);

    const handleLocationSelect = (location) =>{
        setFormData({
            ...formData,
            address: location.display_name,
            lat: location.lat,
            lon: location.lon
        })
    }

    return(
<FocusTrap focusTrapOptions={{ escapeDeactivates: false }}>
    <div
        className="travel-modal-overlay"
        onClick={handleClose}
        onKeyDown={(e) => { if (e.key === "Escape") handleClose(); }}
    >
        <div className="travel-modal activity-detail-modal" role="dialog" aria-modal="true" aria-labelledby="activity-detail-modal-title" onClick={(e)=> e.stopPropagation()}>
            <div className="travel-modal__header">
                <h2 id="activity-detail-modal-title" className="activity-modal__title">
                    {isEditing ? "Edit Activity" : "Activity Details"}
                </h2>
                <button type="button" className="travel-modal__close" aria-label="Close modal" onClick={handleClose}>✕</button>
            </div>



            <form className="travel-modal__form" onSubmit={handleSubmit}>
                <div className="activity-detail-modal-top">
                    <div className="activity-detail-modal-top__right">
                        <div className="travel-modal__field">
                            {isEditing ? (
                                <TextField
                                    id="detail-activity-title"
                                    label="Activity Title"
                                    required
                                    value={formData.title}
                                    onChange={(e)=>setFormData({...formData, title:e.target.value})}
                                />
                            ) : (
                                <>
                                    <label htmlFor="detail-activity-title" className="travel-modal__label">Activity Title</label>
                                    <input
                                        type="text"
                                        id="detail-activity-title"
                                        className="activity-modal__input is-readonly"
                                        value={formData.title}
                                        readOnly
                                    />
                                </>
                            )}
                        </div>

                        <div className="travel-modal__field">
                            {isEditing ? (
                                <TextField
                                    id="detail-activity-date"
                                    type="date"
                                    label="Date"
                                    required
                                    min={getLocalISOString(tripStart)}
                                    max={getLocalISOString(tripEnd)}
                                    value={formData.date}
                                    onChange={(e) => handleTimeUpdate('date', e.target.value)}
                                />
                            ) : (
                                <>
                                    <label htmlFor="detail-activity-date" className="travel-modal__label">Date</label>
                                    <input
                                        type="date"
                                        id="detail-activity-date"
                                        className="activity-modal__input is-readonly"
                                        value={formData.date}
                                        readOnly
                                    />
                                </>
                            )}
                        </div>

                        <div className="activity-modal__time-group">
                            <div className="activity-modal__time-field">
                                <div className="travel-modal__field travel-modal__field--half">
                                    <label htmlFor="detail-activity-start-time" className="travel-modal__label">Start Time <span className="activity-modal__required">*</span></label>
                                    <TimePicker
                                        id="detail-activity-start-time"
                                        hour={formData.startHour}
                                        minute={formData.startMin}
                                        onHourChange={(v) => handleTimeUpdate('startHour', v)}
                                        onMinuteChange={(v) => handleTimeUpdate('startMin', v)}
                                        disabled={!isEditing}
                                    />
                                </div>

                                <div className="activity-modal__time-middle" aria-hidden="true">
                                    <span className="activity-modal__time-middle__spacer">&nbsp;</span>
                                    <span className="activity-modal__time-middle__sep">–</span>
                                </div>

                                <div className="travel-modal__field travel-modal__field--half">
                                    <label htmlFor="detail-activity-end-time" className="travel-modal__label">End Time <span className="activity-modal__required">*</span></label>
                                    <TimePicker
                                        id="detail-activity-end-time"
                                        hour={formData.endHour}
                                        minute={formData.endMin}
                                        onHourChange={(v) => handleTimeUpdate('endHour', v)}
                                        onMinuteChange={(v) => handleTimeUpdate('endMin', v)}
                                        disabled={!isEditing}
                                        min={`${formData.startHour}:${formData.startMin}`}
                                        hasError={!!timeError}
                                    />
                                </div>
                            </div>
                            {timeError && <p className="error-text" role="alert">{timeError}</p>}
                        </div>
                    </div>
                </div>

                <div className="travel-modal__field travel-modal__field-address">
                    {!isEditing ?
                    (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
                                <path d="M480-480q33 0 56.5-23.5T560-560q0-33-23.5-56.5T480-640q-33 0-56.5 23.5T400-560q0 33 23.5 56.5T480-480Zm0 294q122-112 181-203.5T720-552q0-109-69.5-178.5T480-800q-101 0-170.5 69.5T240-552q0 71 59 162.5T480-186Zm0 106Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880q127 0 223.5 89T800-552q0 100-79.5 217.5T480-80Zm0-480Z"/>
                            </svg>
                            <input type="text"
                                id="activity-address"
                                className="activity-modal__input is-readonly"
                                placeholder="address"
                                value={formData.address}
                                readOnly
                            />
                        </>
                    )
                    :
                    (
                        <SearchLocationBar
                            key={activity.id}
                            inputId="activity-address"
                            label="Address"
                            onSelect={handleLocationSelect}
                            onQueryChange={() => setFormData(prev => ({ ...prev, address: "", lat: null, lon: null }))}
                            defaultValue={formData.address}
                            type="address"
                        />
                    )
                    }
                </div>

                <div className="travel-modal__field">
                    <label className="travel-modal__label">Category</label>
                    {!isEditing ? (
                        <span
                            className="activity-modal__category-badge"
                            style={{
                                backgroundColor: CATEGORY_MAP[formData.category]?.bg,
                                color: CATEGORY_MAP[formData.category]?.color,
                            }}
                        >
                            <span aria-hidden="true">{CATEGORY_MAP[formData.category]?.emoji}</span>
                            {formData.category}
                        </span>
                    ) : (
                        <div className="activity-modal__category-grid" role="group" aria-label="Activity categories">
                            {Object.entries(CATEGORY_MAP).map(([key, value]) => (
                                <button
                                    type="button"
                                    key={key}
                                    aria-pressed={formData.category === key}
                                    className={`activity-modal__category-btn ${formData.category === key ? "is-active" : ""}`}
                                    onClick={() => setFormData({...formData, category: key})}
                                >
                                    <span className="activity-modal__category-emoji" aria-hidden="true">{value.emoji}</span>
                                    <span className="activity-modal__category-label">{key}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="travel-modal__field">
                    {isEditing ? (
                        <TextField
                            as="textarea"
                            id="activity-memo"
                            label="Memo"
                            rows="4"
                            value={formData.memo}
                            onChange={(e)=>setFormData({...formData, memo:e.target.value})}
                        />
                    ) : (
                        <>
                            <label htmlFor="activity-memo" className="travel-modal__label">Memo</label>
                            <textarea id="activity-memo"
                                      className="travel-modal__textarea"
                                      placeholder="No memo"
                                      rows="4"
                                      value={formData.memo}
                                      readOnly
                            ></textarea>
                        </>
                    )}
                </div>
                <div className="travel-modal__actions">
                    {!isEditing ?(
                        <>

                            <button type="button" className="btn btn--secondary" aria-label="Edit activity" onClick={() => setIsEditing(true)}>
                                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
                                    <path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/>
                                </svg>
                            </button>
                            {/* DELETE BUTTON */}
                            <button
                                type="button"
                                className="btn btn--sm btn--destruction"
                                aria-label="Delete activity"
                                onClick={onDelete}
                            >
                                <svg className="icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true">
                                    <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
                                </svg>
                            </button>
                        </>
                    ) : (
                        <>
                            <button type="button" className="btn btn--secondary" onClick={handleCancelEdit}>Cancel</button>
                            <button
                                type="submit"
                                className="btn btn--primary"
                                disabled={!!timeError || !formData.title || isSubmitting}>
                                {isSubmitting ? "Saving..." : "Save Changes"}
                            </button>
                        </>
                    )}
                </div>
            </form>
        </div>
        {showDiscardConfirm && (
            // stop clicks/Escape from reaching the overlay handlers underneath
            <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                <ConfirmModal
                    message="You have unsaved changes. Discard them?"
                    confirmLabel="Discard"
                    onConfirm={() => { setShowDiscardConfirm(false); onClose(); }}
                    onCancel={() => setShowDiscardConfirm(false)}
                />
            </div>
        )}
    </div>
</FocusTrap>
    )
}
