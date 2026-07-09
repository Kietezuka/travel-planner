"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import ConfirmModal from "./ConfirmModal";
import { useToast } from "./ToastProvider";
import useHydrated from "../hooks/useHydrated";

export default function GuestTripCard() {
    const showToast = useToast();
    const hydrated = useHydrated();
    const [dismissed, setDismissed] = useState(false);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

    const guestTrip = useMemo(() => {
        if (!hydrated || dismissed) return null;
        const saved = localStorage.getItem("temp_trip");
        if (!saved) return null;
        try {
            const parsed = JSON.parse(saved);
            if (parsed?.destination && parsed?.startDate && parsed?.endDate) {
                return parsed;
            }
        } catch {
            // corrupted guest data; ignore
        }
        return null;
    }, [hydrated, dismissed]);

    if (!guestTrip) return null;

    const fmt = (d) => {
        try {
            return format(parseISO(String(d).split("T")[0]), "MMM d, yyyy");
        } catch {
            return d;
        }
    };

    const days = (() => {
        try {
            return Math.round(
                (parseISO(String(guestTrip.endDate).split("T")[0]) -
                    parseISO(String(guestTrip.startDate).split("T")[0])) / 86400000
            ) + 1;
        } catch {
            return null;
        }
    })();

    const handleDiscard = () => {
        localStorage.removeItem("temp_trip");
        setDismissed(true);
        setShowDiscardConfirm(false);
        showToast("Guest plan discarded.", "info");
    };

    return (
        <section className="home-history">
            <div className="home-list-title">
                <h2>Your Trip</h2>
            </div>
            <div className="history">
                <div className="history-item">
                    <Link href="/trips/guest/weekly" className="history-item__link">
                        <div className="history-item-destination">
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true">
                                <path d="m397-115-99-184-184-99 71-70 145 25 102-102-317-135 84-86 385 68 124-124q23-23 57-23t57 23q23 23 23 56.5T822-709L697-584l68 384-85 85-136-317-102 102 26 144-71 71Z"/>
                            </svg>
                            <strong>{guestTrip.destination}</strong>
                        </div>
                        <div className="history-item-dates">
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true">
                                <path d="M291.5-411.5Q280-423 280-440t11.5-28.5Q303-480 320-480t28.5 11.5Q360-457 360-440t-11.5 28.5Q337-400 320-400t-28.5-11.5Zm160 0Q440-423 440-440t11.5-28.5Q463-480 480-480t28.5 11.5Q520-457 520-440t-11.5 28.5Q497-400 480-400t-28.5-11.5Zm160 0Q600-423 600-440t11.5-28.5Q623-480 640-480t28.5 11.5Q680-457 680-440t-11.5 28.5Q657-400 640-400t-28.5-11.5ZM200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Z"/>
                            </svg>
                            <div className="history-item-date">
                                <span>{fmt(guestTrip.startDate)}</span>
                                <span className="history-item-date-to"> – </span>
                                <span>{fmt(guestTrip.endDate)}</span>
                            </div>
                            <span className="history-item-unsaved">Unsaved</span>
                        </div>
                    </Link>
                    <div className="history-item__actions">
                        {days != null && (
                            <span className="history-item-days">{days} days</span>
                        )}
                        <button
                            type="button"
                            className="btn btn--sm btn--destruction"
                            aria-label={`Discard guest plan for ${guestTrip.destination}`}
                            onClick={() => setShowDiscardConfirm(true)}
                        >
                            <svg className="icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true">
                                <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
                            </svg>
                            Discard
                        </button>
                    </div>
                </div>
            </div>
            {showDiscardConfirm && (
                <ConfirmModal
                    message={`Discard your guest plan for ${guestTrip.destination}? This cannot be undone.`}
                    confirmLabel="Discard"
                    onConfirm={handleDiscard}
                    onCancel={() => setShowDiscardConfirm(false)}
                />
            )}
        </section>
    );
}
