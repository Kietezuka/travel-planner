import Link from "next/link";

export default function GuestBanner() {
    return (
        <div className="guest-banner">
            <div className="guest-banner__inner">
                <div className="guest-banner__message">
                    <svg className="guest-banner__icon" xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor" aria-hidden="true">
                        <path d="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm-40-160h80v-240h-80v240Zm40 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
                    </svg>
                    <p>
                        <strong>Your plan is temporary.</strong> {"It's saved in this browser only — closing this tab will erase it."}
                    </p>
                </div>
                <div className="guest-banner__actions">
                    <Link className="btn btn--primary btn--sm" href="/signup">Sign up to save</Link>
                    <Link className="btn btn--secondary btn--sm" href="/login">Log in</Link>
                </div>
            </div>
        </div>
    );
}
