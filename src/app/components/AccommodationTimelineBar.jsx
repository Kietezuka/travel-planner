"use client";
import { format, parseISO } from "date-fns";

const BAR_COLORS = [
    { bg: '#f0e6b1', text: '#222222' },
    { bg: '#e2d3f6', text: '#222222' },
    { bg: '#d1e5ff', text: '#222222' },
    { bg: '#272a4e', text: '#ffffff' },
];

export default function AccommodationTimelineBar({accommodation, allDates, onOpenModal, index}) {
    const totalDays = allDates.length;
    const dayWidth = 100 / totalDays;

    const startIndex = allDates.indexOf(accommodation.checkinDate);
    const endIndex = allDates.indexOf(accommodation.checkoutDate);

    if(startIndex === -1 || endIndex === -1) return null;

    const left = (startIndex * dayWidth) + (dayWidth / 2);
    const width = ((endIndex - startIndex) * dayWidth);

    const { bg: bgColor, text: textColor } = BAR_COLORS[index % BAR_COLORS.length];

    const checkinLabel = format(parseISO(accommodation.checkinDate), "MMM d");
    const checkoutLabel = format(parseISO(accommodation.checkoutDate), "MMM d");
    // Plain text for the aria-label / title (screen readers & native tooltip)
    const stayLabel = `${checkinLabel}, ${accommodation.checkinTime} – ${checkoutLabel}, ${accommodation.checkoutTime}`;

    const handleKeyDown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpenModal(accommodation);
        }
    };

    return(
        <div
            className="accommodation-bar"
            role="button"
            tabIndex={0}
            aria-label={`${accommodation.title}, ${stayLabel}`}
            style={{
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: bgColor,
                color: textColor,
                border: `1px solid rgba(0,0,0,0.1)`,
            }}
            onClick={() => onOpenModal(accommodation)}
            onKeyDown={handleKeyDown}
        >
            <span>{accommodation.title}</span>
            <span className="accommodation-bar__details" title={stayLabel}>
                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true">
                    <path d="M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Zm280 240q-17 0-28.5-11.5T440-440q0-17 11.5-28.5T480-480q17 0 28.5 11.5T520-440q0 17-11.5 28.5T480-400Zm-188.5-11.5Q280-423 280-440t11.5-28.5Q303-480 320-480t28.5 11.5Q360-457 360-440t-11.5 28.5Q337-400 320-400t-28.5-11.5ZM640-400q-17 0-28.5-11.5T600-440q0-17 11.5-28.5T640-480q17 0 28.5 11.5T680-440q0 17-11.5 28.5T640-400ZM480-240q-17 0-28.5-11.5T440-280q0-17 11.5-28.5T480-320q17 0 28.5 11.5T520-280q0 17-11.5 28.5T480-240Zm-188.5-11.5Q280-263 280-280t11.5-28.5Q303-320 320-320t28.5 11.5Q360-297 360-280t-11.5 28.5Q337-240 320-240t-28.5-11.5ZM640-240q-17 0-28.5-11.5T600-280q0-17 11.5-28.5T640-320q17 0 28.5 11.5T680-280q0 17-11.5 28.5T640-240Z"/>
                </svg>
                <span className="accommodation-bar__stay">
                    <span className="accommodation-bar__date">{checkinLabel}</span>
                    <span className="accommodation-bar__time">{accommodation.checkinTime}</span>
                    <span className="accommodation-bar__sep" aria-hidden="true">–</span>
                    <span className="accommodation-bar__date">{checkoutLabel}</span>
                    <span className="accommodation-bar__time">{accommodation.checkoutTime}</span>
                </span>
            </span>
        </div>
    )
}
