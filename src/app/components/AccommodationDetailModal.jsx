"use client"
import { useEffect, useState } from "react"
import FocusTrap from 'focus-trap-react';
import Image from "next/image";
import { getLocalISOString } from "../utils/date";
import { checkAccommodationOverlap } from "../utils/overlap";
import ConfirmModal from "./ConfirmModal";
import SearchLocationBar from "../components/SearchLocationBar"
import TimePicker from "../components/TimePicker"
import TextField from "../components/TextField"


const buildFormData = (accommodation) => ({
    ...accommodation,
    checkinHour: accommodation.checkinTime?.split(':')[0] || "15",
    checkinMin: accommodation.checkinTime?.split(':')[1] || "00",
    checkoutHour: accommodation.checkoutTime?.split(':')[0] || "10",
    checkoutMin: accommodation.checkoutTime?.split(':')[1] || "00",
});

export default function AccommodationDetailModal({
    accommodation,
    allAccommodations = [],
    onClose,
    onUpdateAccommodation,
    onDelete,
    tripStart,
    tripEnd,
}){
    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeError, setTimeError] = useState("");

    const [formData, setFormData] = useState(() => buildFormData(accommodation));

    useEffect(() =>{
        setFormData(buildFormData(accommodation));
    }, [accommodation]);

    const isDirty = isEditing && JSON.stringify(formData) !== JSON.stringify(buildFormData(accommodation));
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

    const handleClose = () => {
        if (isDirty) {
            setShowDiscardConfirm(true);
            return;
        }
        onClose();
    };

    const handleCancelEdit = () => {
        setFormData(buildFormData(accommodation));
        setTimeError("");
        setIsEditing(false);
    };

    // Validate the whole stay (check-in datetime → check-out datetime) against
    // other accommodations, excluding the one being edited.
    const validateStay = (updatedData) => {
        const checkin = `${updatedData.checkinDate}T${updatedData.checkinHour}:${updatedData.checkinMin}`;
        const checkout = `${updatedData.checkoutDate}T${updatedData.checkoutHour}:${updatedData.checkoutMin}`;

        if (checkout <= checkin) {
            setTimeError("Check-out must be after the check-in date and time!");
            return;
        }

        const overlappingAcc = checkAccommodationOverlap(allAccommodations, checkin, checkout, accommodation.id);
        setTimeError(
            overlappingAcc
                ? `These dates overlap with "${overlappingAcc.title}" (${overlappingAcc.checkinDate} → ${overlappingAcc.checkoutDate}). Please choose a time after its check-out.`
                : ""
        );
    };

    const handleChange = (field, value) => {
        const updatedData = {...formData, [field]: value};
        setFormData(updatedData);
        validateStay(updatedData);
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (timeError || isSubmitting) return;

        const finalData = {
            ...formData,
            checkinTime: `${formData.checkinHour}:${formData.checkinMin}`,
            checkoutTime: `${formData.checkoutHour}:${formData.checkoutMin}`,
            lat: formData.lat ? Number(formData.lat) : null,
            lon: formData.lon ? Number(formData.lon) : null,
        };

        setIsSubmitting(true);
        try {
            await onUpdateAccommodation(finalData);
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
        <div className="travel-modal" role="dialog" aria-modal="true" aria-labelledby="accommodation-modal-title" onClick={(e)=> e.stopPropagation()}>
            <div className="travel-modal__header">
                <h2 id="accommodation-modal-title" className="activity-modal__title">
                    {isEditing ? "Edit Accommodation Details" : "Accommodation Details"}
                </h2>
                <button type="button" className="travel-modal__close" aria-label="Close modal" onClick={handleClose}>✕</button>
            </div>



            <form className="travel-modal__form" onSubmit={handleSubmit}>

                <div className="accommodation-detail-image__wrapper">
                    <Image src="/images/accommodation.webp"
                           alt="Accommodation"
                            width={440}
                            height={140}
                            className="accommodation-detail-image"
                    />
                </div>


                <div className="travel-modal__field">
                    {isEditing ? (
                        <TextField
                            id="detail-accommodation-title"
                            label="Hotel Name / Title"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                        />
                    ) : (
                        <>
                            <label htmlFor="detail-accommodation-title" className="travel-modal__label">Hotel Name / Title</label>
                            <input
                                type="text"
                                id="detail-accommodation-title"
                                className="activity-modal__input is-readonly"
                                value={formData.title}
                                readOnly
                            />
                        </>
                    )}
                </div>

                <div className='datetime__wrapper'>
                    <div className="travel-modal__field">
                        {isEditing ? (
                            <TextField
                                id="detail-accommodation-checkin-date"
                                type="date"
                                label="Check-in Date"
                                required
                                min={getLocalISOString(tripStart)}
                                max={getLocalISOString(tripEnd)}
                                value={formData.checkinDate}
                                onChange={(e) => handleChange('checkinDate', e.target.value)}
                            />
                        ) : (
                            <>
                                <label htmlFor="detail-accommodation-checkin-date" className="travel-modal__label">Check-in Date</label>
                                <input type="date"
                                    id="detail-accommodation-checkin-date"
                                    className="activity-modal__input is-readonly"
                                    value={formData.checkinDate}
                                    readOnly
                                />
                            </>
                        )}
                    </div>

                    <div className="travel-modal__field travel-modal__field--half">
                        <label htmlFor="detail-accommodation-checkin-time" className="travel-modal__label">Check-in Time <span className="activity-modal__required">*</span></label>
                        <TimePicker
                            id="detail-accommodation-checkin-time"
                            hour={formData.checkinHour}
                            minute={formData.checkinMin}
                            onHourChange={(v) => handleChange('checkinHour', v)}
                            onMinuteChange={(v) => handleChange('checkinMin', v)}
                            disabled={!isEditing}
                        />
                    </div>
                </div>

                <span  className='datetime__svg'>
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
                        <path d="M440-800v487L216-537l-56 57 320 320 320-320-56-57-224 224v-487h-80Z"/>
                    </svg>
                </span>

                <div className='datetime__wrapper'>
                    <div className="travel-modal__field">
                        {isEditing ? (
                            <TextField
                                id="detail-accommodation-checkout-date"
                                type="date"
                                label="Check-out Date"
                                required
                                className={timeError ? "text-field--error" : ""}
                                min={formData.checkinDate}
                                max={getLocalISOString(tripEnd)}
                                value={formData.checkoutDate}
                                onChange={(e) => handleChange('checkoutDate', e.target.value)}
                            />
                        ) : (
                            <>
                                <label htmlFor="detail-accommodation-checkout-date" className="travel-modal__label">Check-out Date</label>
                                <input type="date"
                                    id="detail-accommodation-checkout-date"
                                    className="activity-modal__input is-readonly"
                                    value={formData.checkoutDate}
                                    readOnly
                                />
                            </>
                        )}
                    </div>
                    <div className="travel-modal__field travel-modal__field--half">
                        <label htmlFor="detail-accommodation-checkout-time" className="travel-modal__label">Check-out Time <span className="activity-modal__required">*</span></label>
                        <TimePicker
                            id="detail-accommodation-checkout-time"
                            hour={formData.checkoutHour}
                            minute={formData.checkoutMin}
                            onHourChange={(v) => handleChange('checkoutHour', v)}
                            onMinuteChange={(v) => handleChange('checkoutMin', v)}
                            disabled={!isEditing}
                            hasError={!!timeError}
                        />
                    </div>

                    {timeError && <p className="error-text" role="alert">{timeError}</p>}
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
                            key={accommodation.id}
                            inputId="activity-address"
                            label="Hotel name or address"
                            onSelect={handleLocationSelect}
                            onQueryChange={() => setFormData(prev => ({ ...prev, address: "", lat: null, lon: null }))}
                            defaultValue={formData.address}
                            type="address"
                        />
                    )
                    }
                </div>

                <div className="travel-modal__field">
                    {isEditing ? (
                        <TextField
                            as="textarea"
                            id="activity-memo"
                            label="Memo"
                            rows="3"
                            value={formData.memo}
                            onChange={(e)=>setFormData({...formData, memo:e.target.value})}
                        />
                    ) : (
                        <>
                            <label htmlFor="activity-memo" className="travel-modal__label">Memo</label>
                            <textarea id="activity-memo"
                                      className="travel-modal__textarea"
                                      placeholder="No memo"
                                      rows="3"
                                      value={formData.memo}
                                      readOnly
                            ></textarea>
                        </>
                    )}
                </div>
                <div className="travel-modal__actions">
                    {!isEditing ?(
                        <>

                            <button type="button" className="btn btn--secondary" aria-label="Edit accommodation" onClick={() => setIsEditing(true)}>
                                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true">
                                    <path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/>
                                </svg>
                            </button>
                            {/* DELETE BUTTON */}
                            <button
                                type="button"
                                className="btn btn--sm btn--destruction"
                                aria-label="Delete accommodation"
                                onClick={() => onDelete(accommodation.id)}
                            >
                                <svg className="icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true">
                                    <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
                                </svg>
                                Delete
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
