"use client";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import travelLogo from "../../../public/icons/travel_logo.svg";

export default function Header() {
    const { status } = useSession();
    const pathName = usePathname();
    const params = useParams();

    const tripId = params.tripId || params.id;
    const tripDate = params.date;
    const isAuthenticated = status === "authenticated";

    const weeklyHref = isAuthenticated
        ? `/trips/${tripId}/weekly`
        : `/trips/guest/weekly`;
    const dayHref = isAuthenticated
        ? `/trips/${tripId}/weekly/${tripDate}`
        : `/trips/guest/weekly/${tripDate}`;

    const isWeeklyActive =
        tripId && (pathName === `/trips/${tripId}/weekly` || pathName === `/trips/guest/weekly`);
    const isDayActive =
        tripDate && (pathName === `/trips/${tripId}/weekly/${tripDate}` || pathName === `/trips/guest/weekly/${tripDate}`);

    return (
        <header className="header">
            <div className="header__inner">
                <Link className="header__brand" href="/" aria-label="Travel Planner home">
                    <Image
                        className="header__logo"
                        src={travelLogo}
                        alt="Travel Planner Logo"
                        width={24}
                        height={24}
                    />
                    <p className="header__brand-name">Travel Planner</p>
                </Link>

                <nav className="header__nav">
                    <Link className={`header__nav-link ${pathName === "/" ? "active-link" : ""}`} href="/">
                        Home
                    </Link>
                    {tripId && (
                        <>
                            <Link
                                className={`header__nav-link ${isWeeklyActive ? "active-link" : ""}`}
                                href={weeklyHref}
                                aria-label="Weekly Schedule"
                            >
                                Weekly
                            </Link>
                            {tripDate && (
                                <Link
                                    className={`header__nav-link ${isDayActive ? "active-link" : ""}`}
                                    href={dayHref}
                                >
                                    Day View
                                </Link>
                            )}
                        </>
                    )}
                </nav>

                <div className="header__actions">
                    {status === "loading" ? null : isAuthenticated ? (
                        <>
                            <Link className="btn header__btn" href="/account" aria-label="Account">
                                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M234-276q51-39 114-61.5T480-360q69 0 132 22.5T726-276q35-41 54.5-93T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 59 19.5 111t54.5 93Zm146.5-204.5Q340-521 340-580t40.5-99.5Q421-720 480-720t99.5 40.5Q620-639 620-580t-40.5 99.5Q539-440 480-440t-99.5-40.5ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm100-95.5q47-15.5 86-44.5-39-29-86-44.5T480-280q-53 0-100 15.5T294-220q39 29 86 44.5T480-160q53 0 100-15.5ZM523-537q17-17 17-43t-17-43q-17-17-43-17t-43 17q-17 17-17 43t17 43q17 17 43 17t43-17Zm-43-43Zm0 360Z"/></svg>
                                <span className="header__btn-label">Account</span>
                            </Link>
                            <button
                                className="btn header__btn"
                                aria-label="Sign out"
                                onClick={() => signOut({ callbackUrl: '/' })}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h280v80H200Zm440-160-55-58 102-102H360v-80h327L585-622l55-58 200 200-200 200Z"/></svg>
                                <span className="header__btn-label">Sign out</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <Link className="btn header__btn" href="/login" aria-label="Log in">
                                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M481-120v-60h299v-600H481v-60h299q24 0 42 18t18 42v600q0 24-18 42t-42 18H481Zm-55-185-43-43 102-102H120v-60h363L381-612l43-43 176 176-174 174Z"/></svg>
                            </Link>
                            <Link className="btn btn--primary header__btn" href="/signup">Sign Up</Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
