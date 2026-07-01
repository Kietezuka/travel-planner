"use server";
import db from "../../lib/db";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { getEmailError, getPasswordError } from "../../lib/validation";

export async function updateProfileAction(formData) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Not authenticated" };

    const name = formData.get("name");
    // Normalize email (lowercase + trim) to stay consistent with signup/login.
    const email = (formData.get("email") || "").toString().trim().toLowerCase();

    if (!name || !email) return { success: false, error: "Name and email are required" };

    const emailError = getEmailError(email);
    if (emailError) return { success: false, error: emailError };

    const existing = (await db.execute({
        sql: "SELECT id FROM users WHERE email = ? AND id != ?",
        args: [email, session.user.id],
    })).rows[0];
    if (existing) return { success: false, error: "Email already in use by another account" };

    await db.execute({
        sql: "UPDATE users SET name = ?, email = ? WHERE id = ?",
        args: [name, email, session.user.id],
    });

    return { success: true };
}

export async function updatePasswordAction(formData) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Not authenticated" };

    const currentPassword = formData.get("currentPassword");
    const newPassword = formData.get("newPassword");
    const confirmPassword = formData.get("confirmPassword");

    if (!currentPassword || !newPassword || !confirmPassword) return { success: false, error: "All fields are required" };
    if (newPassword !== confirmPassword) return { success: false, error: "New passwords do not match" };

    const passwordError = getPasswordError(newPassword);
    if (passwordError) return { success: false, error: passwordError };

    const user = (await db.execute({
        sql: "SELECT password FROM users WHERE id = ?",
        args: [session.user.id],
    })).rows[0];
    if (!user) return { success: false, error: "User not found" };

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return { success: false, error: "Current password is incorrect" };

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.execute({
        sql: "UPDATE users SET password = ? WHERE id = ?",
        args: [hashed, session.user.id],
    });

    return { success: true };
}

export async function deleteAccountAction(formData) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Not authenticated" };

    const password = formData.get("password");
    if (!password) return { success: false, error: "Password is required to delete your account" };

    const userId = Number(session.user.id);
    const user = (await db.execute({
        sql: "SELECT password FROM users WHERE id = ?",
        args: [userId],
    })).rows[0];
    if (!user) return { success: false, error: "User not found" };

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return { success: false, error: "Password is incorrect" };

    // Delete the user and everything under it (trips -> day_memos / activities /
    // accommodations). Done explicitly in a transaction because libSQL over HTTP
    // can't rely on `PRAGMA foreign_keys = ON` / ON DELETE CASCADE persisting.
    const tx = await db.transaction("write");
    try {
        await tx.execute({ sql: "DELETE FROM activities WHERE tripId IN (SELECT id FROM trips WHERE userId = ?)", args: [userId] });
        await tx.execute({ sql: "DELETE FROM day_memos WHERE tripId IN (SELECT id FROM trips WHERE userId = ?)", args: [userId] });
        await tx.execute({ sql: "DELETE FROM accommodations WHERE tripId IN (SELECT id FROM trips WHERE userId = ?)", args: [userId] });
        await tx.execute({ sql: "DELETE FROM trips WHERE userId = ?", args: [userId] });
        await tx.execute({ sql: "DELETE FROM users WHERE id = ?", args: [userId] });
        await tx.commit();
    } catch (error) {
        await tx.rollback();
        console.error("Delete account error:", error);
        return { success: false, error: "Something went wrong deleting your account" };
    }

    return { success: true };
}
