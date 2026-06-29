"use client";

// Must match WeeklyTable's 30-minute slot grid (slot = h * 2 + (m >= 30 ? 1 : 0))
const MINUTE_OPTIONS = ["00", "30"];
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

export default function TimePicker({ id, hour, minute, onHourChange, onMinuteChange, disabled = false, hasError = false, min = null }) {
    const h = parseInt(hour, 10);

    // Optional lower bound ("HH:MM", e.g. an activity's start time) — earlier
    // values are disabled in the dropdowns and unreachable via the arrows.
    const [minHour, minMinute] = min ? min.split(':').map(Number) : [null, null];
    const isBelowMin = (hh, mm) => min != null && (hh < minHour || (hh === minHour && mm < minMinute));

    const incHour = () => {
        if (min != null) {
            if (h >= 23) return;
            onHourChange(String(h + 1).padStart(2, '0'));
        } else {
            onHourChange(String((h + 1) % 24).padStart(2, '0'));
        }
    };
    const decHour = () => {
        if (min != null) {
            if (isBelowMin(h - 1, parseInt(minute, 10))) return;
            onHourChange(String(h - 1).padStart(2, '0'));
        } else {
            onHourChange(String((h - 1 + 24) % 24).padStart(2, '0'));
        }
    };

    // Legacy data may hold 15/45-minute values; keep them selectable until changed
    const minuteOptions = MINUTE_OPTIONS.includes(minute)
        ? MINUTE_OPTIONS
        : [...MINUTE_OPTIONS, minute].sort();

    const minIdx = MINUTE_OPTIONS.indexOf(minute);
    const incMin = () => {
        const next = MINUTE_OPTIONS[(minIdx + 1) % MINUTE_OPTIONS.length];
        if (isBelowMin(h, parseInt(next, 10))) return; // wrapped below the floor
        onMinuteChange(next);
    };
    const decMin = () => {
        const next = MINUTE_OPTIONS[(minIdx - 1 + MINUTE_OPTIONS.length) % MINUTE_OPTIONS.length];
        if (isBelowMin(h, parseInt(next, 10))) return;
        onMinuteChange(next);
    };

    if (disabled) {
        return (
            <span className="time-picker time-picker--readonly">
                {hour}:{minute}
            </span>
        );
    }

    return (
        <div className={`time-picker${hasError ? " time-picker--error" : ""}`}>
            <div className="time-picker__unit">
                <button type="button" className="time-picker__btn" onClick={incHour} aria-label="Increase hour" tabIndex={-1}>
                    <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor">
                        <path d="M480-528 296-344l-56-56 240-240 240 240-56 56-184-184Z"/>
                    </svg>
                </button>
                <select
                    id={id}
                    className="time-picker__value"
                    value={hour}
                    onChange={(e) => onHourChange(e.target.value)}
                    aria-label="Hour"
                >
                    {HOUR_OPTIONS.map(option => (
                        <option key={option} value={option} disabled={min != null && parseInt(option, 10) < minHour}>{option}</option>
                    ))}
                </select>
                <button type="button" className="time-picker__btn" onClick={decHour} aria-label="Decrease hour" tabIndex={-1}>
                    <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor">
                        <path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z"/>
                    </svg>
                </button>
            </div>
            <span className="time-picker__colon">:</span>
            <div className="time-picker__unit">
                <button type="button" className="time-picker__btn" onClick={incMin} aria-label="Increase minute" tabIndex={-1}>
                    <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor">
                        <path d="M480-528 296-344l-56-56 240-240 240 240-56 56-184-184Z"/>
                    </svg>
                </button>
                <select
                    className="time-picker__value"
                    value={minute}
                    onChange={(e) => onMinuteChange(e.target.value)}
                    aria-label="Minute"
                >
                    {minuteOptions.map(option => (
                        <option key={option} value={option} disabled={isBelowMin(h, parseInt(option, 10))}>{option}</option>
                    ))}
                </select>
                <button type="button" className="time-picker__btn" onClick={decMin} aria-label="Decrease minute" tabIndex={-1}>
                    <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor">
                        <path d="M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z"/>
                    </svg>
                </button>
            </div>
        </div>
    );
}
