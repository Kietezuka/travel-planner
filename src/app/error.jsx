"use client";
import Link from "next/link";

export default function Error({ error, reset }) {
    return (
        <main className="page-error">
            <p className="page-error__message">
                Something went wrong. Your saved trips are safe - please try again.
            </p>
            <div className="page-error__actions">
                <button type="button" className="btn btn--primary btn--sm" onClick={() => reset()}>
                    Try again
                </button>
                <Link href="/" className="btn btn--secondary btn--sm">Go Home</Link>
            </div>
        </main>
    );
}
