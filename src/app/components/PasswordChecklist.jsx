"use client";
import { getPasswordChecks } from "../../lib/validation";

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px" fill="currentColor" aria-hidden="true">
        <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
    </svg>
);

const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px" fill="currentColor" aria-hidden="true">
        <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
    </svg>
);

export default function PasswordChecklist({ password, touched }) {
    const checks = getPasswordChecks(password || "");
    return (
        <ul className="pw-checklist">
            {checks.map(({ label, ok }) => (
                <li
                    key={label}
                    className={`pw-checklist__item${touched ? (ok ? " is-ok" : " is-fail") : ""}`}
                >
                    {touched
                        ? (ok ? <CheckIcon /> : <XIcon />)
                        : <span className="pw-checklist__dot" aria-hidden="true" />
                    }
                    {label}
                </li>
            ))}
        </ul>
    );
}
