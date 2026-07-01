"use server";

import db from "../lib/db";
import bcrypt from "bcryptjs";
import { getEmailError, getPasswordError } from "./validation";

export async function signupAction(formData) {
  // Normalize email (lowercase + trim) so it's stored and matched consistently.
  const email = (formData.get("email") || "").toString().trim().toLowerCase();
  const password = formData.get("password");
  const userName = formData.get("userName");
  const confirmPassword = formData.get("confirmPassword");

  if (!email || !password || !userName) {
    return { success: false, error: "All fields are required" };
  }

  const emailError = getEmailError(email);
  if (emailError) return { success: false, error: emailError };

  const passwordError = getPasswordError(password);
  if (passwordError) return { success: false, error: passwordError };

  if (password !== confirmPassword) {
    return { success: false, error: "Passwords do not match. Please re-enter your password." };
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await db.execute({
      sql: "INSERT INTO users (email, password, name) VALUES (?, ?, ?)",
      args: [email, hashedPassword, userName],
    });
  } catch (error) {
    // Rely on the Database UNIQUE(email) constraint instead of a pre-SELECT,
    // which would have a race condition between check and insert.
    if (
      error.message?.includes("UNIQUE constraint failed") ||
      error.code === "SQLITE_CONSTRAINT_UNIQUE" ||
      error.code?.includes("CONSTRAINT")
    ) {
      return { success: false, error: "Email already exists" };
    }
    console.error("Signup Error:", error);
    return { success: false, error: "Something went wrong during signup" };
  }

  // The client signs the user in right away - no second login step
  return { success: true };
}
