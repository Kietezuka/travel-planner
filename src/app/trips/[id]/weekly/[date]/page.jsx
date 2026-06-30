"use client";
import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { eachDayOfInterval, format } from "date-fns";
import Link from "next/link";
import DaySchedule from "../../../../components/DaySchedule"
import GuestBanner from "../../../../components/GuestBanner";

export default function DayPage({ params: paramsPromise }){
    const params = use(paramsPromise);
    const { status } = useSession();
    const { id, date } = params;
    const isGuest = id === "guest" && status !== "authenticated";

    const [trip, setTrip] = useState(null);
    const [activities, setActivities] = useState([]);
    const [dayMemo, setDayMemo] = useState("");
    const [accommodations, setAccommodations] = useState([]);
    const [allDates, setAllDates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);


    useEffect(() => {
        if (status === "loading") return;
        async function loadData() {
            if (isGuest) {
                // --- GUEST LOGIC ---
                const saved = localStorage.getItem("temp_trip");
                if (saved) {
                    let tripData;
                    try {
                        tripData = JSON.parse(saved);
                    } catch {
                        setLoading(false);
                        return;
                    }
                    setTrip(tripData);
                    setAccommodations(tripData.accommodations || []);
                    
                    const currentDay = tripData.daysData?.find(d => d.date === date);
                    if (currentDay) {
                        setActivities(currentDay.activities || []);
                        setDayMemo(currentDay.memo || "");
                    }
                    
                    generateDateTabs(tripData.startDate, tripData.endDate);
                }
            } else {
                // --- USER LOGIC (Database via API) ---
                try {
                    const res = await fetch(`/api/trips/${id}?date=${date}`);
                    const data = await res.json();

                    if (res.ok) {
                        setError(null);
                        setTrip(data);
                        setActivities(data.activities || []);
                        setDayMemo(data.dayMemo || "");
                        setAccommodations(data.accommodations || []);
                        generateDateTabs(data.startDate, data.endDate);
                    } else if (res.status === 403) {
                        setError("You don't have permission to view this trip.");
                    } else if (res.status === 404) {
                        setError("Trip not found.");
                    } else {
                        setError("Failed to load trip data. Please try again.");
                    }
                } catch (err) {
                    console.error("Failed to load daily schedule", err);
                    setError("Network error. Please check your connection.");
                }
            }
            setLoading(false);
        }

        function generateDateTabs(start, end) {
            if (start && end) {
                const dates = eachDayOfInterval({
                    start: new Date(start),
                    end: new Date(end)
                }).map(d => format(d, 'yyyy-MM-dd'));
                setAllDates(dates);
            }
        }

        loadData();
    }, [id, date, isGuest, status]);

    useEffect(() => {
        if (trip?.destination && date) {
            document.title = `${trip.destination} · ${date} | Travel Planner`;
        }
        return () => { document.title = "Travel Planner"; };
    }, [trip, date]);

    if (loading) return (
        <main className="page-loading">
            <svg className="page-loading__spinner" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-label="Loading">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
            </svg>
        </main>
    )

    if (error) {
        const isRetriable = error.includes("try again") || error.includes("connection");
        return (
            <main className="page-error">
                <p className="page-error__message">{error}</p>
                <div className="page-error__actions">
                    <Link href="/" className="btn btn--primary btn--sm">Go Home</Link>
                    {isRetriable && (
                        <button className="btn btn--secondary btn--sm" onClick={() => window.location.reload()}>Try again</button>
                    )}
                </div>
            </main>
        );
    }

    if (!trip) return (
        <main className="page-error">
            <p className="page-error__message">Trip information not found.</p>
            <div className="page-error__actions">
                <Link href="/" className="btn btn--primary btn--sm">Go Home</Link>
            </div>
        </main>
    );

    return(
        <>
            {isGuest && <GuestBanner />}
            <DaySchedule 
                trip={trip}
                activities={activities}
                accommodations={accommodations}
                date={date}
                allDates={allDates}
                dayMemo={dayMemo}
                isGuest={isGuest}
            />
        </>
    )
}