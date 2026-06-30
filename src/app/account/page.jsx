"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ProfileSection from "./ProfileSection";
import PasswordSection from "./PasswordSection";
import DangerZone from "./DangerZone";

export default function AccountPage() {
    const { data: session, status, update } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
    }, [status, router]);

    if (status === "loading") {
        return <main className="page-loading"><p>Loading...</p></main>;
    }

    if (status === "unauthenticated") {
        return null;
    }

    return (
        <main className="container account-page">
            <button
                type="button"
                className="btn btn--secondary btn--sm account-page__back"
                onClick={() => router.back()}
                aria-label="Go back"
            >
                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor" aria-hidden="true">
                    <path d="M360-240 120-480l240-240 56 56-144 144h568v80H272l144 144-56 56Z"/>
                </svg>
                Back
            </button>

            <div className="account-page__header">
                <svg xmlns="http://www.w3.org/2000/svg" height="28px" viewBox="0 -960 960 960" width="28px" fill="currentColor">
                    <path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Z"/>
                </svg>
                <h1 className="account-page__title">Account</h1>
            </div>

            <ProfileSection session={session} update={update} />
            <PasswordSection />
            <DangerZone />
        </main>
    );
}
