import Link from "next/link";

export const metadata = {
    title: "Page not found",
};

export default function NotFound() {
    return (
        <main className="page-error">
            <h1 className="page-error__code">404</h1>
            <p className="page-error__message">
                This page doesn&apos;t exist. The link may be old, or the trip may have been deleted.
            </p>
            <div className="page-error__actions">
                <Link href="/" className="btn btn--primary btn--sm">Go Home</Link>
            </div>
        </main>
    );
}
