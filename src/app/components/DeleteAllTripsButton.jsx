"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAllTripsAction } from "../actions/trip";
import ConfirmModal from "./ConfirmModal";
import { useToast } from "./ToastProvider";

export default function DeleteAllTripsButton({ tripCount }) {
    const router = useRouter();
    const showToast = useToast();
    const [showConfirm, setShowConfirm] = useState(false);

    const handleConfirm = async () => {
        setShowConfirm(false);
        const result = await deleteAllTripsAction();
        if (result?.success) {
            router.refresh();
            showToast("All trips deleted.", "success");
        } else {
            showToast(result?.error || "Failed to delete trips.", "error");
        }
    };

    return (
        <>
            <button
                type="button"
                className="btn btn--sm btn--destruction"
                onClick={() => setShowConfirm(true)}
            >
                Delete All
            </button>
            {showConfirm && (
                <ConfirmModal
                    message={`Delete all ${tripCount} trip(s)? This cannot be undone.`}
                    confirmLabel="Delete All"
                    onConfirm={handleConfirm}
                    onCancel={() => setShowConfirm(false)}
                />
            )}
        </>
    );
}
