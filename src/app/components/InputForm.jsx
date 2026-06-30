"use client";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import FocusTrap from "focus-trap-react";
import { DayPicker } from "react-day-picker";
import { format, differenceInCalendarDays } from "date-fns";
import "react-day-picker/dist/style.css";

import { createTripAction } from "../actions/trip";

import SearchLocationBar from "../components/SearchLocationBar";
import { useToast } from "../components/ToastProvider";
import useHydrated from "../hooks/useHydrated";

export default function InputForm(){
    const { data: session, status } = useSession();
    const showToast = useToast();
    const [destination, setDestination] = useState("");
    const [selected, setSelected] = useState({ from: undefined, to: undefined });
    const [open, setOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);

    const router = useRouter();

    const mounted = useHydrated();

    const label = selected?.from && selected?.to
        ? `${format(selected.from, "MMM d")} - ${format(selected.to, "MMM d, yyyy")}`
        : "";

    const daysCount = selected?.from && selected?.to
            ? differenceInCalendarDays(selected.to, selected.from) + 1
            : 0;

    const footerText = selected?.from && selected?.to
        ? `${label} • ${daysCount} day(s)`
        : "Click a start date, then an end date";

    async function handleSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const isLoggedIn = status === "authenticated" && session?.user?.id;

        //For guest user save their plan in their localstorage
        if(!isLoggedIn){
            const guestTrip = {
                id: "guest",
                destination: formData.get("destination"),
                startDate: format(selected.from, "yyyy-MM-dd"),
                endDate: format(selected.to, "yyyy-MM-dd"),
                daysData: generateDates(selected.from, selected.to),
                accommodations: [],
                isGuest: true
            };

            localStorage.setItem("temp_trip", JSON.stringify(guestTrip));

            router.push("/trips/guest/weekly");
        } else {
            //For logged in users
            setIsPending(true);
            try{
                const result = await createTripAction(formData);

                // On success the action redirects, so only re-enable on failure
                if(result?.error){
                    showToast(result.error, "error");
                    setIsPending(false);
                }
            } catch(error){
                if (error?.digest?.startsWith('NEXT_REDIRECT')) return;
                showToast("Failed to create the trip. Please try again.", "error");
                setIsPending(false);
            }
        }
    }

    const handleLocationSelect = (location) =>{
        setDestination(location.name || location.display_name);
    }

    const generateDates = (start, end) => {
        const dates = [];
        let current = new Date(start);
        const stop = new Date(end);

        while (current <= stop) {
            dates.push({
                date: format(current, "yyyy-MM-dd"),
                day: current.toLocaleDateString('en-US', { weekday: 'short' }),
                activities: []
            });
            current.setDate(current.getDate() + 1);
        }
        return dates;
    };

    // Modal
    const dateModal = (mounted && open) && createPortal(
        <FocusTrap focusTrapOptions={{ escapeDeactivates: false }}>
        <div
            className="date-modal-overlay"
            onClick={() => setOpen(false)}
            onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        >
            <div
                className="date-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="date-modal-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="date-modal__header">
                    <h3 id="date-modal-title" className="date-modal__title">Select dates</h3>
                    <button className="date-modal__close" type="button" aria-label="Close date picker" onClick={() => setOpen(false)}>✕</button>
                </div>
                <div className="date-modal__body">
                    <DayPicker
                        mode="range"
                        selected={selected}
                        onSelect={(range) => setSelected(range ?? { from: undefined, to: undefined })}
                        numberOfMonths={2}
                        disabled={{ before: new Date() }}
                        footer={footerText}
                    />
                </div>
                <div className="date-modal__footer">
                    <button className="btn btn--secondary" type="button" onClick={() => setSelected({ from: undefined, to: undefined })}>Clear</button>
                    <button className="btn btn--primary" type="button" onClick={() => setOpen(false)}>Done</button>
                </div>
            </div>
        </div>
        </FocusTrap>,
        document.body
    );

    return(
        <>
        <form className="travel-form" onSubmit={handleSubmit}>
            <div className="form-group">
                <SearchLocationBar
                    inputId="destination"
                    label="Destination"
                    onSelect={handleLocationSelect}
                    onQueryChange={() => setDestination("")}
                    defaultValue=""
                    type="destination"
                />
                <input type="hidden" name="destination" value={destination} />
            </div>

            {/* for send date to the server */}
            <input
                type="hidden"
                name="startDate"
                value={selected?.from ? format(selected.from, "yyyy-MM-dd") : ""}
            />
            <input
                type="hidden"
                name="endDate"
                value={selected?.to ? format(selected.to, "yyyy-MM-dd") : ""}
            />

            <div className="form-group">
                <div className="text-field text-field--always-float">
                    <div className="text-field__control date-range__field">
                        <input
                            className="text-field__input date-range__input"
                            id="date-range-input"
                            value={label}
                            type="text"
                            placeholder=" "
                            aria-haspopup="dialog"
                            onClick={() => setOpen(true)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    setOpen(true);
                                }
                            }}
                            readOnly
                        />
                        <label htmlFor="date-range-input" className="text-field__label">Dates</label>
                    </div>
                </div>
            </div>

            {dateModal}

            <div className="travel-form__cta">
                <button
                    type="submit"
                    className="btn btn--primary form-button"
                    disabled={!destination || !selected.from || !selected.to || isPending}>
                    {isPending ? "Creating..." : "Make Plan"}
                </button>
            </div>
        </form>
        <div className="travel-message">
            {(!destination || !selected.from || !selected.to) && (
                <p className="form-hint">
                    {!destination
                        ? "Search and pick a destination from the suggestions to continue."
                        : "Select travel dates to continue."}
                </p>
            )}
            {status !== "authenticated" && (
                <p className="guest-notice">
                    {"Planning as a guest — your trip is saved in this browser only and will be lost if you close this tab."}
                </p>
            )}
        </div>
        </>
    )
}
