"use client";
import { useId, useState } from "react";

const EyeOpen = () => (
    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor" aria-hidden="true">
        <path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-130 0-238.5-71T72-500q56-168 164.5-239T480-808q130 0 238.5 71T880-500q-56 168-164.5 239T480-200Z"/>
    </svg>
);

const EyeOff = () => (
    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor" aria-hidden="true">
        <path d="m644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 34.5-12t37.5-4q75 0 127.5 52.5T660-500q0 20-4 37.5T644-428Zm128 126-58-56q38-29 67.5-63.5T832-500q-50-101-143.5-160.5T480-720q-29 0-57 4t-55 12l-62-62q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302Zm20 246L624-222q-35 11-70.5 16.5T480-200q-151 0-269-83.5T40-500q21-53 53-98.5t73-81.5L56-792l56-56 736 736-56 56ZM222-624q-29 26-53 57t-41 67q50 101 143.5 160.5T480-280q20 0 39-2.5t39-5.5l-36-38q-11 3-21 4.5t-21 1.5q-75 0-127.5-52.5T300-500q0-11 1.5-21t4.5-21l-84-82Zm319 93Zm-151 75Z"/>
    </svg>
);

// MD3 outlined text field with floating label.
// - `as`: "input" (default) | "textarea" | "select"
// - date/time/select always keep the label floated (no text placeholder)
// - type="password" renders a built-in show/hide trailing toggle
export default function TextField({
    id,
    label,
    type = "text",
    as = "input",
    children,
    supportingText,
    error,
    leadingIcon,
    trailingIcon,
    alwaysFloat = false,
    className = "",
    inputClassName = "",
    required = false,
    ...rest
}) {
    const reactId = useId();
    const fieldId = id || reactId;
    const message = error || supportingText;
    const supportId = message ? `${fieldId}-support` : undefined;
    const [showPw, setShowPw] = useState(false);
    const isPassword = type === "password";

    // date/time inputs and selects have no text placeholder → keep label up
    const floatAlways =
        alwaysFloat ||
        as === "select" ||
        ["date", "time", "datetime-local", "month", "week"].includes(type);

    const wrapperClasses = [
        "text-field",
        leadingIcon ? "text-field--leading" : "",
        (trailingIcon || isPassword) ? "text-field--trailing" : "",
        floatAlways ? "text-field--always-float" : "",
        error ? "text-field--error" : "",
        className,
    ].filter(Boolean).join(" ");

    const controlProps = {
        id: fieldId,
        className: `text-field__input ${inputClassName}`.trim(),
        "aria-describedby": supportId,
        "aria-invalid": error ? "true" : undefined,
        required,
        ...rest,
    };

    let control;
    if (as === "select") {
        control = <select {...controlProps}>{children}</select>;
    } else if (as === "textarea") {
        control = <textarea {...controlProps} placeholder=" " />;
    } else {
        control = (
            <input
                {...controlProps}
                type={isPassword ? (showPw ? "text" : "password") : type}
                placeholder=" "
            />
        );
    }

    return (
        <div className={wrapperClasses}>
            <div className="text-field__control">
                {leadingIcon && (
                    <span className="text-field__icon text-field__icon--leading" aria-hidden="true">{leadingIcon}</span>
                )}
                {control}
                <label htmlFor={fieldId} className="text-field__label">
                    {label}{required && <span className="text-field__required"> *</span>}
                </label>
                {isPassword ? (
                    <button
                        type="button"
                        className="text-field__icon text-field__icon--trailing password-input__toggle"
                        aria-label={showPw ? "Hide password" : "Show password"}
                        onClick={() => setShowPw(s => !s)}
                    >
                        {showPw ? <EyeOpen /> : <EyeOff />}
                    </button>
                ) : trailingIcon && (
                    <span className="text-field__icon text-field__icon--trailing">{trailingIcon}</span>
                )}
            </div>
            {message && (
                <span id={supportId} className="text-field__support" role={error ? "alert" : undefined}>
                    {message}
                </span>
            )}
        </div>
    );
}
