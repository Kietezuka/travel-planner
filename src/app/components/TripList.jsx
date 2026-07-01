"use client";

import { useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { deleteTripAction } from "../actions/trip";
import ConfirmModal from "./ConfirmModal";
import { useToast } from "./ToastProvider";

function TripItem({ trip, isPast, onDeleteClick }) {
    return (
        <div className={`history-item${isPast ? " history-item--past" : ""}`}>
            <Link
                href={`/trips/${trip.id}/weekly`}
                className="history-item__link"
            >
                <div className="history-item-destination">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true">
                        <path d="m397-115-99-184-184-99 71-70 145 25 102-102-317-135 84-86 385 68 124-124q23-23 57-23t57 23q23 23 23 56.5T822-709L697-584l68 384-85 85-136-317-102 102 26 144-71 71Z"/>
                    </svg>
                    <strong>{trip.destination}</strong>
                </div>
                <div className="history-item-dates">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true">
                        <path d="M291.5-411.5Q280-423 280-440t11.5-28.5Q303-480 320-480t28.5 11.5Q360-457 360-440t-11.5 28.5Q337-400 320-400t-28.5-11.5Zm160 0Q440-423 440-440t11.5-28.5Q463-480 480-480t28.5 11.5Q520-457 520-440t-11.5 28.5Q497-400 480-400t-28.5-11.5Zm160 0Q600-423 600-440t11.5-28.5Q623-480 640-480t28.5 11.5Q680-457 680-440t-11.5 28.5Q657-400 640-400t-28.5-11.5ZM200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Z"/>
                    </svg>
                    <div className="history-item-date">
                        <span>{format(parseISO(trip.startDate), "MMM d, yyyy")}</span>
                        <span className="history-item-date-to"> – </span>
                        <span>{format(parseISO(trip.endDate), "MMM d, yyyy")}</span>
                    </div>
                    {isPast && <span className="history-item-ended">Ended</span>}
                </div>
            </Link>
            <div className="history-item__actions">
                <span className="history-item-days">
                    {Math.round((new Date(trip.endDate) - new Date(trip.startDate)) / 86400000) + 1} days
                </span>
                <button
                    type="button"
                    className="btn btn--sm btn--destruction"
                    aria-label={`Delete trip to ${trip.destination}`}
                    onClick={() => onDeleteClick(trip.id)}
                >
                    <svg className="icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true">
                        <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
                    </svg>
                    Delete
                </button>
            </div>
        </div>
    );
}

export default function TripList({ userTrips }){
    const router = useRouter();
    const showToast = useToast();
    const [expanded, setExpanded] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState(null);

    const today = format(new Date(), "yyyy-MM-dd");
    // Upcoming (incl. ongoing): soonest first. Past: most recent first.
    const upcomingTrips = userTrips
        .filter(trip => trip.endDate >= today)
        .sort((a, b) => a.startDate.localeCompare(b.startDate));
    const pastTrips = userTrips
        .filter(trip => trip.endDate < today)
        .sort((a, b) => b.startDate.localeCompare(a.startDate));

    // One combined list (upcoming first, then past), collapsed to 5 until expanded.
    const LIST_LIMIT = 5;
    const orderedTrips = [
        ...upcomingTrips.map(trip => ({ trip, isPast: false })),
        ...pastTrips.map(trip => ({ trip, isPast: true })),
    ];
    const visibleTrips = expanded ? orderedTrips : orderedTrips.slice(0, LIST_LIMIT);

    const handleDeleteClick = (tripId) => {
        setPendingDeleteId(tripId);
    };

    const handleConfirmDelete = async () => {
        const tripId = pendingDeleteId;
        setPendingDeleteId(null);
        const result = await deleteTripAction(tripId);
        if (result?.success) {
            router.refresh();
            showToast("Trip deleted.", "success");
        } else {
            showToast(result?.error || "Failed to delete trip.", "error");
        }
    };

    return(
        <>
            <div className="history">
                {userTrips.length === 0 && (
                    <div className="empty-state" role="status">
                        <div className="empty-state__icon" aria-hidden="true">
                            <svg xmlns="http://www.w3.org/2000/svg" height="48px" viewBox="0 -960 960 960" width="48px" fill="currentColor">
                                <path d="M280-120q-33 0-56.5-23.5T200-200q-33 0-56.5-23.5T120-280v-360q0-33 23.5-56.5T200-720h120v-80q0-33 23.5-56.5T400-880h160q33 0 56.5 23.5T640-800v80h120q33 0 56.5 23.5T840-640v360q0 33-23.5 56.5T760-200q0 33-23.5 56.5T680-120q-33 0-56.5-23.5T600-200H360q0 33-23.5 56.5T280-120Zm120-600h160v-80H400v80ZM200-280h560v-360H200v360Zm160-40v-280 280Zm240 0v-280 280Zm-120 0v-280 280Zm-280 40v-360 360Z"/>
                            </svg>
                        </div>
                        <h3 className="empty-state__title">No trips yet</h3>
                        <p className="empty-state__text">
                            Plan your first adventure — search a destination and pick your travel dates above to get started.
                        </p>
                        <button
                            type="button"
                            className="btn btn--primary empty-state__cta"
                            onClick={() => {
                                const el = document.getElementById("destination");
                                if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.focus(); }
                            }}
                        >
                            Plan a trip
                        </button>
                    </div>
                )}

                {visibleTrips.map((item, idx) => {
                    const prev = visibleTrips[idx - 1];
                    // Show the "Past trips" heading right before the first past trip
                    const showPastHeading = item.isPast && (!prev || !prev.isPast);
                    return (
                        <Fragment key={item.trip.id}>
                            {showPastHeading && <h3 className="history-section-title">Past trips</h3>}
                            <TripItem trip={item.trip} isPast={item.isPast} onDeleteClick={handleDeleteClick} />
                        </Fragment>
                    );
                })}

                {orderedTrips.length > LIST_LIMIT && (
                    <button
                        className="btn btn--primary"
                        onClick={() => setExpanded(v => !v)}>
                        {expanded ? "See Less" : "See More"}
                    </button>
                )}
            </div>
            {pendingDeleteId && (
                <ConfirmModal
                    message="Are you sure you want to delete this trip? This cannot be undone."
                    confirmLabel="Delete"
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setPendingDeleteId(null)}
                />
            )}
        </>
    )
}
