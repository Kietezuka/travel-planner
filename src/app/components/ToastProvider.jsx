"use client";
import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(null);
let _id = 0;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    // action: optional { label, onClick } rendered as a button (e.g. Undo)
    const showToast = useCallback((message, type = "info", duration, action) => {
        const id = ++_id;
        const ms = duration ?? (action ? 8000 : type === "error" ? 6000 : 3000);
        setToasts(prev => [...prev, { id, message, type, duration: ms, action }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), ms);
    }, []);

    const dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id));

    return (
        <ToastContext.Provider value={showToast}>
            {children}
            <div className="toast-stack" aria-live="polite" aria-atomic="false">
                {toasts.map(t => (
                    <div
                        key={t.id}
                        className={`toast toast--${t.type}`}
                        role="alert"
                    >
                        <span className="toast__badge" aria-hidden="true">
                            {t.type === "success" && (
                                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                                    <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
                                </svg>
                            )}
                            {t.type === "error" && (
                                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                                    <path d="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm-40-160h80v-240h-80v240Zm40 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
                                </svg>
                            )}
                            {t.type === "info" && (
                                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
                                    <path d="M440-280h80v-240h-80v240Zm40-320q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Zm0 520q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
                                </svg>
                            )}
                        </span>
                        <span className="toast__message">{t.message}</span>
                        {t.action && (
                            <button
                                type="button"
                                className="toast__action"
                                onClick={() => { t.action.onClick(); dismiss(t.id); }}
                            >
                                {t.action.label}
                            </button>
                        )}
                        <button
                            type="button"
                            className="toast__close"
                            onClick={() => dismiss(t.id)}
                            aria-label="Dismiss"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor">
                                <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
                            </svg>
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    return ctx ?? (() => {});
}
