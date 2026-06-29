export function toMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

function normalizeDate(dateStr) {
    return new Date(dateStr).toISOString().split('T')[0];
}

export function checkActivityOverlap(activities, newStart, newEnd, date, excludeId = null) {
    const nStart = toMinutes(newStart);
    const nEnd = toMinutes(newEnd);
    const compareDate = normalizeDate(date);
    return activities.find(act => {
        if (excludeId != null && String(act.id) === String(excludeId)) return false;
        if (normalizeDate(act.date) !== compareDate) return false;
        return nStart < toMinutes(act.endTime) && nEnd > toMinutes(act.startTime);
    }) || null;
}

// Accommodation overlap is checked across the whole stay (check-in datetime →
// check-out datetime), not just same-day times — so a new stay that falls
// inside an existing multi-day booking is correctly rejected. Boundaries that
// touch (new check-in == existing check-out) do NOT overlap, so back-to-back
// stays right after check-out are allowed.
// `newCheckin` / `newCheckout` are ISO datetime strings: "YYYY-MM-DDTHH:MM".
export function checkAccommodationOverlap(accommodations, newCheckin, newCheckout, excludeId = null) {
    return accommodations.find(acc => {
        if (excludeId != null && String(acc.id) === String(excludeId)) return false;
        if (!acc.checkinDate || !acc.checkoutDate) return false;
        const accCheckin = `${acc.checkinDate}T${acc.checkinTime || "00:00"}`;
        const accCheckout = `${acc.checkoutDate}T${acc.checkoutTime || "00:00"}`;
        // Fixed-width ISO strings compare chronologically as plain strings.
        return newCheckin < accCheckout && newCheckout > accCheckin;
    }) || null;
}
