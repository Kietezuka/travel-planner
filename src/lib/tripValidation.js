// Pure validation helpers shared by server actions (and unit-testable).

export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function toMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

export function validateTripInput(destination, startDate, endDate) {
  if (!destination) return "Destination is required.";
  if (!ISO_DATE_RE.test(startDate || "") || !ISO_DATE_RE.test(endDate || "")) {
    return "Travel dates are invalid.";
  }
  if (endDate < startDate) return "End date must be on or after the start date.";
  return null;
}

export function validateActivityInput(activity) {
  if (!activity || !(activity.title || "").toString().trim()) return "Title is required.";
  if (!ISO_DATE_RE.test(activity.date || "")) return "Date is invalid.";
  if (!TIME_RE.test(activity.startTime || "") || !TIME_RE.test(activity.endTime || "")) {
    return "Times are invalid.";
  }
  if (toMinutes(activity.endTime) <= toMinutes(activity.startTime)) {
    return "End time must be after the start time.";
  }
  return null;
}

export function validateAccommodationInput(accommodation) {
  if (!accommodation || !(accommodation.title || "").toString().trim()) return "Title is required.";
  if (!ISO_DATE_RE.test(accommodation.checkinDate || "") || !ISO_DATE_RE.test(accommodation.checkoutDate || "")) {
    return "Dates are invalid.";
  }
  if (!TIME_RE.test(accommodation.checkinTime || "") || !TIME_RE.test(accommodation.checkoutTime || "")) {
    return "Times are invalid.";
  }
  const checkin = `${accommodation.checkinDate}T${accommodation.checkinTime}`;
  const checkout = `${accommodation.checkoutDate}T${accommodation.checkoutTime}`;
  if (checkout <= checkin) return "Check-out must be after check-in.";
  return null;
}

// Returns the first overlapping activity from `existing`, or null.
// `existing` rows need { id, startTime, endTime }.
export function findOverlappingActivity(existing, startTime, endTime, excludeId = null) {
  const nStart = toMinutes(startTime);
  const nEnd = toMinutes(endTime);
  return existing.find(act => {
    if (excludeId != null && String(act.id) === String(excludeId)) return false;
    return nStart < toMinutes(act.endTime) && nEnd > toMinutes(act.startTime);
  }) || null;
}

// Returns the first overlapping accommodation from `existing`, or null.
// Compares the whole stay (check-in datetime → check-out datetime). Boundaries
// that touch (new check-in == existing check-out) do NOT overlap.
// `newCheckin` / `newCheckout` are ISO datetime strings: "YYYY-MM-DDTHH:MM".
// `existing` rows need { id, checkinDate, checkinTime, checkoutDate, checkoutTime }.
export function findOverlappingAccommodation(existing, newCheckin, newCheckout, excludeId = null) {
  return existing.find(acc => {
    if (excludeId != null && String(acc.id) === String(excludeId)) return false;
    if (!acc.checkinDate || !acc.checkoutDate) return false;
    const accCheckin = `${acc.checkinDate}T${acc.checkinTime || "00:00"}`;
    const accCheckout = `${acc.checkoutDate}T${acc.checkoutTime || "00:00"}`;
    return newCheckin < accCheckout && newCheckout > accCheckin;
  }) || null;
}
