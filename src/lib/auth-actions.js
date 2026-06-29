"use server";

import db from "../lib/db";
import bcrypt from "bcryptjs";
import { validateEmail, validatePassword } from "./validation";

export async function signupAction(formData) {
  // Normalize email (lowercase + trim) so it's stored and matched consistently.
  const email = (formData.get("email") || "").toString().trim().toLowerCase();
  const password = formData.get("password");
  const userName = formData.get("userName");
  const confirmPassword = formData.get("confirmPassword");

  if (!email || !password || !userName) {
    throw new Error("All fields are required");
  }

  validateEmail(email);
  validatePassword(password);

  if (password !== confirmPassword) {
    throw new Error("Passwords do not match. Please re-enter your password.");
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const stmt = db.prepare(
      "INSERT INTO users (email, password, name) VALUES (?, ?, ?)"
    );
    stmt.run(email, hashedPassword, userName);
  } catch (error) {
    // Rely on the Database UNIQUE(email) constraint instead of a pre-SELECT,
    // which would have a race condition between check and insert.
    if (error.message.includes("UNIQUE constraint failed")) {
      throw new Error("Email already exists");
    }
    console.error("Signup Error:", error);
    throw new Error("Something went wrong during signup");
  }

  // The client signs the user in right away - no second login step
  return { success: true };
}