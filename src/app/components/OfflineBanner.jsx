"use client";
import { useEffect, useState, useSyncExternalStore } from "react";

function subscribe(callback) {
    window.addEventListener("online", callback);
    window.addEventListener("offline", callback);
    return () => {
        window.removeEventListener("online", callback);
        window.removeEventListener("offline", callback);
    };
}

export default function OfflineBanner() {
    const isOnline = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
    const [justRecovered, setJustRecovered] = useState(false);

    useEffect(() => {
        // setState here happens inside the event callback, not the effect body
        const handleOnline = () => {
            setJustRecovered(true);
        };
        const handleOffline = () => {
            setJustRecovered(false);
        };
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    useEffect(() => {
        if (!justRecovered) return;
        const id = setTimeout(() => setJustRecovered(false), 4000);
        return () => clearTimeout(id);
    }, [justRecovered]);

    if (isOnline && !justRecovered) return null;

    return (
        <div
            className={`offline-banner${isOnline ? " offline-banner--recovered" : ""}`}
            role="status"
            aria-live="polite"
        >
            {!isOnline ? (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor" aria-hidden="true">
                        <path d="m790-56-58-58H200q-50 0-85-35t-35-85q0-50 35-85t85-35h8q-14-23-21.5-48T180-454q0-31 9.5-60.5T217-569L56-730l56-56 734 734-56-56ZM480-820q117 0 198.5 81.5T760-540q0 26-5 51t-15 48l-62-62q1-9 1.5-18.5T680-540q0-83-58.5-141.5T480-740q-9 0-18.5.5T443-738l-63-63q23-9 48-14t52-5Z"/>
                    </svg>
                    {"You're offline — changes can't be saved right now."}
                </>
            ) : (
                <>Back online.</>
            )}
        </div>
    );
}
