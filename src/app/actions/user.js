"use server";
import db from "../../lib/db";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { validateEmail, validatePassword } from "../../lib/validation";

export async function updateProfileAction(formData) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Not authenticated");

    const name = formData.get("name");
    // Normalize email (lowercase + trim) to stay consistent with signup/login.
    const email = (formData.get("email") || "").toString().trim().toLowerCase();

    if (!name || !email) throw new Error("Name and email are required");

    validateEmail(email);

    const existing = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(email, session.user.id);
    if (existing) throw new Error("Email already in use by another account");

    db.prepare("UPDATE users SET name = ?, email = ? WHERE id = ?").run(name, email, session.user.id);

    return { success: true };
}

export async function updatePasswordAction(formData) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Not authenticated");

    const currentPassword = formData.get("currentPassword");
    const newPassword = formData.get("newPassword");
    const confirmPassword = formData.get("confirmPassword");

    if (!currentPassword || !newPassword || !confirmPassword) throw new Error("All fields are required");
    if (newPassword !== confirmPassword) throw new Error("New passwords do not match");
    validatePassword(newPassword);

    const user = db.prepare("SELECT password FROM users WHERE id = ?").get(session.user.id);
    if (!user) throw new Error("User not found");

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new Error("Current password is incorrect");

    const hashed = await bcrypt.hash(newPassword, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashed, session.user.id);

    return { success: true };
}

export async function deleteAccountAction(formData) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Not authenticated");

    const password = formData.get("password");
    if (!password) throw new Error("Password is required to delete your account");

    const userId = Number(session.user.id);
    const user = db.prepare("SELECT password FROM users WHERE id = ?").get(userId);
    if (!user) throw new Error("User not found");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Password is incorrect");

    // Deleting the user cascades to their trips, then to each trip's children
    // (day_memos / activities / accommodations) via ON DELETE CASCADE.
    // Requires foreign_keys = ON, set in lib/db.js.
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);

    return { success: true };
}
