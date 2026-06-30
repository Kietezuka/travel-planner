"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { deleteAccountAction } from "../actions/user";
import ConfirmModal from "../components/ConfirmModal";
import TextField from "../components/TextField";

export default function DangerZone() {
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState("");
    const [pending, setPending] = useState(false);
    const [password, setPassword] = useState("");
    const [showConfirm, setShowConfirm] = useState(false);

    async function handleDelete() {
        setShowConfirm(false);
        setError("");
        setPending(true);
        try {
            const formData = new FormData();
            formData.append("password", password);
            await deleteAccountAction(formData);
            // account is deleted -> end the session and land on the public home
            await signOut({ callbackUrl: "/" });
        } catch (err) {
            setError(err.message);
            setPending(false);
        }
    }

    return (
        <section className="account-section account-section--danger">
            <div className="account-section__header">
                <h2 className="account-section__title">Delete account</h2>
                {!showForm ? (
                    <button
                        type="button"
                        className="btn btn--sm btn--destruction"
                        onClick={() => { setShowForm(true); setError(""); }}
                    >
                        Delete
                    </button>
                ) : (
                    <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => { setShowForm(false); setError(""); setPassword(""); }}
                    >
                        Cancel
                    </button>
                )}
            </div>

            {error && <p className="error-text account-msg" role="alert">{error}</p>}

            <div className={`account__collapsible${showForm ? " is-open" : ""}`}>
                <form onSubmit={(e) => { e.preventDefault(); setShowConfirm(true); }}>
                    <div className="account-fields account-fields--padded">
                        <p className="account-danger-note">
                            This permanently deletes your account and all of your trips. This cannot be undone.
                        </p>
                        <div className="account-field">
                            <TextField
                                id="deletePassword"
                                name="deletePassword"
                                type="password"
                                label="Confirm with your password"
                                autoComplete="current-password"
                                required
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn btn--sm btn--destruction"
                            disabled={!password || pending}
                        >
                            {pending ? "Deleting..." : "Delete my account"}
                        </button>
                    </div>
                </form>
            </div>

            {showConfirm && (
                <ConfirmModal
                    message="Delete your account and all of your trips? This cannot be undone."
                    confirmLabel="Delete account"
                    onConfirm={handleDelete}
                    onCancel={() => setShowConfirm(false)}
                />
            )}
        </section>
    );
}
