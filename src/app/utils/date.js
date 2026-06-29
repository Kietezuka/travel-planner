export function getLocalISOString(dateValue) {
    if (!dateValue) return "";
    const d = new Date(dateValue);
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
}
