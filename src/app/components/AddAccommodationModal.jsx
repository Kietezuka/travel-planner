"use client";
import FocusTrap from 'focus-trap-react';
import { useEffect, useState} from "react";
import { getLocalISOString } from "../utils/date";
import { checkAccommodationOverlap } from "../utils/overlap";
import SearchLocationBar  from "../components/SearchLocationBar";
import TimePicker from "../components/TimePicker";
import TextField from "../components/TextField";

export default function AddAccommodationModal({
    onClose,
    onAddAccommodation,
    tripStart,
    tripEnd,
    allAccommodations = [],
    destination = ""
}){
    const [timeError, setTimeError] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        title: "",
        checkinDate: getLocalISOString(tripStart),
        checkoutDate: getLocalISOString(tripEnd),
        checkinHour: "15",
        checkinMin: "00",
        checkoutHour: "10",
        checkoutMin: "00",
        address: "",
        memo: "",
        lat: null,
        lon: null,
    });

    const handleLocationSelect = (location) =>{
        setFormData(prev => ({
            ...prev,
            title:prev.title === "" ? location.name : prev.title,
            address: location.display_name,
            lat: parseFloat(location.lat),
            lon: parseFloat(location.lon)
        }));
    }

    const validateDates = (updatedData) => {
        const checkin = `${updatedData.checkinDate}T${updatedData.checkinHour}:${updatedData.checkinMin}`;
        const checkout = `${updatedData.checkoutDate}T${updatedData.checkoutHour}:${updatedData.checkoutMin}`;

        if (checkout <= checkin) {
            setTimeError("Check-out must be after the check-in date and time!");
            return;
        }

        const overlappingAcc = checkAccommodationOverlap(allAccommodations, checkin, checkout);
        setTimeError(
            overlappingAcc
                ? `These dates overlap with "${overlappingAcc.title}" (${overlappingAcc.checkinDate} → ${overlappingAcc.checkoutDate}). Please choose a time after its check-out.`
                : ""
        );
    };

    const handleChange = (field, value) => {
        const updatedData = { ...formData, [field]: value };
        setFormData(updatedData);
        validateDates(updatedData);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (timeError || isSubmitting ) return;

        setIsSubmitting(true);

        const finalData = {
            title: formData.title,
            checkinDate: formData.checkinDate,
            checkoutDate: formData.checkoutDate,
            checkinTime: `${formData.checkinHour}:${formData.checkinMin}`,
            checkoutTime: `${formData.checkoutHour}:${formData.checkoutMin}`,
            address: formData.address,
            memo: formData.memo,
            lat: formData.lat,
            lon: formData.lon
        };

        try {
            await onAddAccommodation(finalData);
        } catch (error) {
            // parent's handler shows the error toast
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        const originalStyle = window.getComputedStyle(document.body).overflow;

        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = originalStyle || "unset";
        };
    }, []);


    return(
<FocusTrap focusTrapOptions={{ escapeDeactivates: false, initialFocus: '#accommodation-title' }}>
    <div
        className="travel-modal-overlay"
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
        <div className="travel-modal" role="dialog" aria-modal="true" aria-labelledby="add-accommodation-modal-title" onClick={(e)=> e.stopPropagation()}>
            <div className="travel-modal__header">
                <h2 id="add-accommodation-modal-title" className="activity-modal__title">Add Accommodation</h2>
                <button type="button" className="travel-modal__close" aria-label="Close modal" onClick={onClose}>✕</button>
            </div>
            <form className="travel-modal__form" onSubmit={handleSubmit}>

                <div className="travel-modal__field">
                    <TextField
                        id="accommodation-title"
                        label="Hotel Name / Title"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                    />
                </div>

                <div className='datetime__wrapper'>
                    <div className="travel-modal__field">
                        <TextField
                            id="accommodation-checkin-date"
                            type="date"
                            label="Check-in Date"
                            required
                            min={getLocalISOString(tripStart)}
                            max={getLocalISOString(tripEnd)}
                            value={formData.checkinDate}
                            onChange={(e) => handleChange('checkinDate', e.target.value)}
                        />
                    </div>

                    <div className="travel-modal__field travel-modal__field--half">
                        <label htmlFor="accommodation-checkin-time" className="travel-modal__label">Time <span className="activity-modal__required">*</span></label>
                        <TimePicker
                            id="accommodation-checkin-time"
                            hour={formData.checkinHour}
                            minute={formData.checkinMin}
                            onHourChange={(v) => handleChange('checkinHour', v)}
                            onMinuteChange={(v) => handleChange('checkinMin', v)}
                        />
                    </div>
                </div>

                <span className='datetime__svg'>
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
                        <path d="M440-800v487L216-537l-56 57 320 320 320-320-56-57-224 224v-487h-80Z"/>
                    </svg>
                </span>

                <div className='datetime__wrapper'>
                    <div className="travel-modal__field">
                        <TextField
                            id="accommodation-checkout-date"
                            type="date"
                            label="Check-out Date"
                            required
                            className={timeError ? "text-field--error" : ""}
                            min={formData.checkinDate}
                            max={getLocalISOString(tripEnd)}
                            value={formData.checkoutDate}
                            onChange={(e) => handleChange('checkoutDate', e.target.value)}
                        />
                    </div>
                    <div className="travel-modal__field travel-modal__field--half">
                        <label htmlFor="accommodation-checkout-time" className="travel-modal__label">Time <span className="activity-modal__required">*</span></label>
                        <TimePicker
                            id="accommodation-checkout-time"
                            hour={formData.checkoutHour}
                            minute={formData.checkoutMin}
                            onHourChange={(v) => handleChange('checkoutHour', v)}
                            onMinuteChange={(v) => handleChange('checkoutMin', v)}
                            hasError={!!timeError}
                        />
                    </div>
                </div>

                {timeError && <p className="error-text" role="alert">{timeError}</p>}

                <div className="travel-modal__field travel-modal__field-address">
                    <SearchLocationBar
                        inputId="accommodation-address"
                        label="Hotel name or address"
                        onSelect={handleLocationSelect}
                        onQueryChange={() => setFormData(prev => ({ ...prev, address: "", lat: null, lon: null }))}
                        defaultValue={formData.address}
                        type="accommodation"
                        destination={destination}
                    />
                </div>

                <div className="travel-modal__field">
                    <TextField
                        as="textarea"
                        id="accommodation-memo"
                        label="Memo"
                        rows="4"
                        value={formData.memo}
                        onChange={(e)=>setFormData({...formData, memo:e.target.value})}
                    />
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
