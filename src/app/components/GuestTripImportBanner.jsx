"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { importGuestTripAction } from "../actions/trip";
import ConfirmModal from "./ConfirmModal";
import { useToast } from "./ToastProvider";
import useHydrated from "../hooks/useHydrated";

export default function GuestTripImportBanner() {
    const router = useRouter();
    const showToast = useToast();
    const hydrated = useHydrated();
    const [dismissed, setDismissed] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
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

    const handleImport = async () => {
        setIsImporting(true);
        try {
            const result = await importGuestTripAction(guestTrip);
            if (result?.success && result.id) {
                localStorage.removeItem("temp_trip");
                showToast("Your guest plan has been saved to your account!", "success");
                router.push(`/trips/${result.id}/weekly`);
            } else {
                showToast(result?.error || "Failed to import your guest plan.", "error");
                setIsImporting(false);
            }
        } catch {
            showToast("Failed to import your guest plan.", "error");
            setIsImporting(false);
        }
    };

    const handleDiscard = () => {
        localStorage.removeItem("temp_trip");
        setDismissed(true);
        setShowDiscardConfirm(false);
        showToast("Guest plan discarded.", "info");
    };

    return (
        <>
            <div className="guest-import-banner" role="region" aria-label="Unsaved guest plan">
                <div className="guest-import-banner__message">
                    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor" aria-hidden="true">
                        <path d="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm-40-160h80v-240h-80v240Zm40 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
                    </svg>
                    <p>
                        <strong>You have an unsaved guest plan:</strong>{" "}
                        {guestTrip.destination} ({fmt(guestTrip.startDate)} – {fmt(guestTrip.endDate)}).
                        {" "}It only exists in this browser until you save it.
                    </p>
                </div>
                <div className="guest-import-banner__actions">
                    <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        onClick={handleImport}
                        disabled={isImporting}
                    >
                        {isImporting ? "Saving..." : "Save"}
                    </button>
                    <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => setShowDiscardConfirm(true)}
                        disabled={isImporting}
                    >
                        Discard
                    </button>
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
        </>
    );
}
