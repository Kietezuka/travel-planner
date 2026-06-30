"use client";
import { useEffect, useState, useMemo, use } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import WeeklyTable from "../../../components/WeeklyTable";
import GuestBanner from "../../../components/GuestBanner";
import { eachDayOfInterval, format } from "date-fns";

export default function WeeklyPage({ params: paramsPromise }){
    const { data: session, status } = useSession();
    const params = use(paramsPromise);
    const { id } = params;
    const isGuest = id === "guest" && status !== "authenticated";
    
    const [tripData, setTripData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (status === "loading") return;

        async function loadData() {
            if (isGuest) {
                const saved = localStorage.getItem("temp_trip");
                if (saved) {
                    try {
                        setTripData(JSON.parse(saved));
                    } catch {
                        // corrupted guest data, fall through to "not found"
                    }
                }
                setLoading(false);
            } else {
                try {
                    const res = await fetch(`/api/trips/${id}`);
                    if (res.ok) {
                        const data = await res.json();
                        setError(null);
                        setTripData(data);
                    } else if (res.status === 403) {
                        setError("You don't have permission to view this trip.");
                    } else if (res.status === 404) {
                        setError("Trip not found.");
                    } else {
                        setError("Failed to load trip data. Please try again.");
                    }
                } catch (err) {
                    console.error("Failed to load trip", err);
                    setError("Network error. Please check your connection.");
                } finally {
                    setLoading(false);
                }
            }
        }
        loadData();
    }, [id, isGuest, status]);

    const processedDaysData = useMemo(() => {
        if (!tripData || !tripData.startDate || !tripData.endDate) return [];
        
        // If it's a guest, they might already have daysData structured
        if (isGuest && tripData.daysData) return tripData.daysData;

        try {
            const allDates = eachDayOfInterval({
                start: new Date(tripData.startDate),
                end: new Date(tripData.endDate),
            });

            return allDates.map((date) => {
                const dateStr = format(date, "yyyy-MM-dd");
                return {
                    date: dateStr,
                    day: format(date, "eeee"),
                    activities: (tripData.activities || []).filter(a => a.date === dateStr)
                };
            });
        } catch {
            return [];
        }
    }, [tripData, isGuest]);

    useEffect(() => {
        if (tripData?.destination) {
            document.title = `${tripData.destination} | Travel Planner`;
        }
        return () => { document.title = "Travel Planner"; };
    }, [tripData]);

    if (loading) return (
        <main className="page-loading">
            <svg className="page-loading__spinner" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-label="Loading">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
            </svg>
        </main>
    );

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

    if (!tripData) return (
        <main className="page-error">
            <p className="page-error__message">Trip information not found.</p>
            <div className="page-error__actions">
                <Link href="/" className="btn btn--primary btn--sm">Go Home</Link>
            </div>
        </main>
    )

    // Extract only the date portion (2026-01-31) from ISOString (2026-01-31T...)
    const sDate = (tripData.startDate || "").split('T')[0];
    const eDate = (tripData.endDate || "").split('T')[0] || sDate;

    return(
        <div>
            {isGuest && <GuestBanner />}
            
            <WeeklyTable
                tripId={id} 
                destination={tripData.destination} 
                startDate={sDate}
                endDate={eDate}
                daysData={processedDaysData}
                accommodations={tripData.accommodations || []}
                isGuest={isGuest}
            />

        </div>
    )
}