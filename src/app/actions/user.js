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

    const existing = (await db.execute({
        sql: "SELECT id FROM users WHERE email = ? AND id != ?",
        args: [email, session.user.id],
    })).rows[0];
    if (existing) throw new Error("Email already in use by another account");

    await db.execute({
        sql: "UPDATE users SET name = ?, email = ? WHERE id = ?",
        args: [name, email, session.user.id],
    });

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

    const user = (await db.execute({
        sql: "SELECT password FROM users WHERE id = ?",
        args: [session.user.id],
    })).rows[0];
    if (!user) throw new Error("User not found");

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new Error("Current password is incorrect");

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.execute({
        sql: "UPDATE users SET password = ? WHERE id = ?",
        args: [hashed, session.user.id],
    });

    return { success: true };
}

export async function deleteAccountAction(formData) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Not authenticated");

    const password = formData.get("password");
    if (!password) throw new Error("Password is required to delete your account");

    const userId = Number(session.user.id);
    const user = (await db.execute({
        sql: "SELECT password FROM users WHERE id = ?",
        args: [userId],
    })).rows[0];
    if (!user) throw new Error("User not found");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Password is incorrect");

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
        throw error;
    }

    return { success: true };
}
