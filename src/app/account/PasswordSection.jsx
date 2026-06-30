"use client";
import { useState } from "react";
import { updatePasswordAction } from "../actions/user";
import TextField from "../components/TextField";
import PasswordChecklist from "../components/PasswordChecklist";

export default function PasswordSection() {
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [pending, setPending] = useState(false);
    const [newPwValue, setNewPwValue] = useState("");
    const [newPwTouched, setNewPwTouched] = useState(false);
    const [confirmValue, setConfirmValue] = useState("");
    const [confirmTouched, setConfirmTouched] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setSuccess("");
        setPending(true);
        try {
            const formData = new FormData(e.currentTarget);
            await updatePasswordAction(formData);
            setSuccess("Password updated.");
            setShowForm(false);
            e.target.reset();
        } catch (err) {
            setError(err.message);
        } finally {
            setPending(false);
        }
    }

    return (
        <section className="account-section">
            <div className="account-section__header">
                <h2 className="account-section__title">Password</h2>
                {!showForm ? (
                    <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        onClick={() => { setShowForm(true); setError(""); setSuccess(""); }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor" aria-hidden="true">
                            <path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/>
                        </svg>
                        Change
                    </button>
                ) : (
                    <div className="account-section__actions">
                        <button
                            type="button"
                            className="btn btn--secondary btn--sm"
                            onClick={() => { setShowForm(false); setError(""); setSuccess(""); setNewPwValue(""); setNewPwTouched(false); setConfirmValue(""); setConfirmTouched(false); }}
                        >
                            Cancel
                        </button>
                        <button
                            form="password-form"
                            className="btn btn--primary btn--sm"
                            type="submit"
                            disabled={pending}
                        >
                            {pending ? "Saving..." : "Save"}
                        </button>
                    </div>
                )}
            </div>

            {error && <p className="error-text account-msg" role="alert">{error}</p>}
            {success && <p className="success-text account-msg" role="status">{success}</p>}

            <div className={`account__collapsible${showForm ? " is-open" : ""}`}>
                <form id="password-form" onSubmit={handleSubmit}>
                    <div className="account-fields account-fields--padded">
                        <div className="account-field">
                            <TextField
                                id="currentPassword"
                                name="currentPassword"
                                type="password"
                                label="Current password"
                                autoComplete="current-password"
                                required
                            />
                        </div>
                        <div className="account-field">
                            <TextField
                                id="newPassword"
                                name="newPassword"
                                type="password"
                                label="New password"
                                autoComplete="new-password"
                                required
                                onChange={(e) => setNewPwValue(e.target.value)}
                                onBlur={() => setNewPwTouched(true)}
                            />
                            <PasswordChecklist password={newPwValue} touched={newPwTouched} />
                        </div>
                        <div className="account-field">
                            <TextField
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                label="Confirm new password"
                                autoComplete="new-password"
                                required
                                onChange={(e) => setConfirmValue(e.target.value)}
                                onBlur={() => setConfirmTouched(true)}
                            />
                            {confirmTouched && confirmValue !== "" && (
                                <p className={`pw-match${confirmValue === newPwValue ? " is-ok" : " is-fail"}`} role="status">
                                    {confirmValue === newPwValue ? "✓ Passwords match" : "✗ Passwords do not match"}
                                </p>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </section>
    );
}
