"use client";
import { useState } from "react";
import { updateProfileAction } from "../actions/user";
import { getEmailError } from "../../lib/validation";
import TextField from "../components/TextField";

export default function ProfileSection({ session, update }) {
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [pending, setPending] = useState(false);
    const [emailError, setEmailError] = useState("");
    const [emailTouched, setEmailTouched] = useState(false);

    function handleEmailChange(e) {
        if (emailTouched) setEmailError(getEmailError(e.target.value) || "");
    }
    function handleEmailBlur(e) {
        setEmailTouched(true);
        setEmailError(getEmailError(e.target.value) || "");
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setSuccess("");
        setPending(true);
        try {
            const formData = new FormData(e.currentTarget);
            const result = await updateProfileAction(formData);
            if (!result?.success) {
                setError(result?.error || "Something went wrong");
                return;
            }
            await update();
            setIsEditing(false);
            setSuccess("Profile updated.");
        } catch (err) {
            setError(err.message);
        } finally {
            setPending(false);
        }
    }

    return (
        <section className="account-section">
            <div className="account-section__header">
                <h2 className="account-section__title">Profile</h2>
                {!isEditing ? (
                    <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        onClick={() => { setIsEditing(true); setError(""); setSuccess(""); }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor" aria-hidden="true">
                            <path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/>
                        </svg>
                        Edit
                    </button>
                ) : (
                    <div className="account-section__actions">
                        <button
                            type="button"
                            className="btn btn--secondary btn--sm"
                            onClick={() => { setIsEditing(false); setError(""); setEmailError(""); setEmailTouched(false); }}
                        >
                            Cancel
                        </button>
                        <button
                            form="profile-form"
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

            <form id="profile-form" key={`${session?.user?.name}|${session?.user?.email}`} onSubmit={handleSubmit}>
                <div className="account-fields">
                    <div className="account-field">
                        {isEditing ? (
                            <TextField
                                id="name"
                                name="name"
                                type="text"
                                label="User name"
                                autoComplete="name"
                                defaultValue={session?.user?.name || ""}
                                required
                            />
                        ) : (
                            <>
                                <label className="account-field__label" htmlFor="name">User name</label>
                                <input
                                    className="account-field__input is-readonly"
                                    id="name"
                                    name="name"
                                    type="text"
                                    defaultValue={session?.user?.name || ""}
                                    readOnly
                                />
                            </>
                        )}
                    </div>
                    <div className="account-field">
                        {isEditing ? (
                            <TextField
                                id="email"
                                name="email"
                                type="email"
                                label="Email"
                                autoComplete="email"
                                defaultValue={session?.user?.email || ""}
                                required
                                error={emailError || undefined}
                                onChange={handleEmailChange}
                                onBlur={handleEmailBlur}
                            />
                        ) : (
                            <>
                                <label className="account-field__label" htmlFor="email">Email</label>
                                <input
                                    className="account-field__input is-readonly"
                                    id="email"
                                    name="email"
                                    type="email"
                                    defaultValue={session?.user?.email || ""}
                                    readOnly
                                />
                            </>
                        )}
                    </div>
                </div>
            </form>
        </section>
    );
}
