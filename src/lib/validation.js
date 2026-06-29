// Two flavors per field:
//   getXError  → returns a message string (or null) for live UI feedback
//   validateX  → throws on invalid, for server-side guards
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export function getEmailError(email) {
    if (!email) return null;
    return EMAIL_REGEX.test(email) ? null : "Please enter a valid email address (e.g. name@example.com)";
}

export function validateEmail(email) {
    const error = getEmailError(email);
    if (error) throw new Error(error);
}

const PASSWORD_RULES = [
    { label: "8+ characters",               test: p => p.length >= 8 },
    { label: "Uppercase letter",             test: p => /[A-Z]/.test(p) },
    { label: "Lowercase letter",             test: p => /[a-z]/.test(p) },
    { label: "Number",                       test: p => /[0-9]/.test(p) },
    { label: "Special character (!@#$%...)", test: p => /[^A-Za-z0-9]/.test(p) },
];

export function getPasswordChecks(password) {
    return PASSWORD_RULES.map(({ label, test }) => ({
        label,
        ok: !!password && test(password),
    }));
}

export function getPasswordError(password) {
    if (!password) return null;
    const failing = PASSWORD_RULES.filter(({ test }) => !test(password));
    return failing.length > 0
        ? `Password must include: ${failing.map(r => r.label.toLowerCase()).join(", ")}`
        : null;
}

export function validatePassword(password) {
    const error = getPasswordError(password);
    if (error) throw new Error(error);
}
