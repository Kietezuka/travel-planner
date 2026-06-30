"use server"
import { getServerSession } from "next-auth";
import db from '../../lib/db';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { authOptions } from '../api/auth/[...nextauth]/route';
import {
  validateTripInput,
  validateActivityInput,
  validateAccommodationInput,
  findOverlappingActivity,
  findOverlappingAccommodation,
} from '../../lib/tripValidation';

async function requireTripOwner(tripId) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const trip = (await db.execute({
    sql: 'SELECT userId FROM trips WHERE id = ?',
    args: [tripId],
  })).rows[0];
  if (!trip || Number(trip.userId) !== Number(session.user.id)) return null;
  return session;
}

// The server is the source of truth for overlaps — client checks are UX only.
async function findServerOverlap(tripId, activity, excludeId = null) {
  const existing = (await db.execute({
    sql: 'SELECT id, title, startTime, endTime FROM activities WHERE tripId = ? AND date = ?',
    args: [tripId, activity.date],
  })).rows;
  return findOverlappingActivity(existing, activity.startTime, activity.endTime, excludeId);
}

async function findServerAccommodationOverlap(tripId, acc, excludeId = null) {
  const existing = (await db.execute({
    sql: 'SELECT id, title, checkinDate, checkinTime, checkoutDate, checkoutTime FROM accommodations WHERE tripId = ?',
    args: [tripId],
  })).rows;
  const newCheckin = `${acc.checkinDate}T${acc.checkinTime || "00:00"}`;
  const newCheckout = `${acc.checkoutDate}T${acc.checkoutTime || "00:00"}`;
  return findOverlappingAccommodation(existing, newCheckin, newCheckout, excludeId);
}

//create new trip from input form
export async function createTripAction(formData) {
  const session = await getServerSession(authOptions);

  if(!session || !session.user){
    return { success: false, error: "Please login to save your trip :)" };
  }

  let newTripId;
  const destination = (formData.get('destination') || "").toString().trim();
  const userId = session.user.id;
  const startDate = formData.get('startDate');
  const endDate = formData.get('endDate');

  const validationError = validateTripInput(destination, startDate, endDate);
  if (validationError) {
    return { success: false, error: validationError };
  }

  try {
  if (!userId) {
      console.error("User ID is missing from session!");
      return { success: false, error: "User session error." };
    }
    const info = await db.execute({
      sql: `
      INSERT INTO trips (destination, userId, startDate, endDate)
      VALUES (?, ?, ?, ?)
    `,
      args: [destination, Number(userId), startDate, endDate],
    });

    newTripId = Number(info.lastInsertRowid);
  } catch(error){
    console.error("DATABASE ERROR:", error.message);
    return { success: false, error: "Failed to create the trip. Please try again." };
  }
  redirect(`/trips/${newTripId}/weekly`);
}

//import a guest plan (localStorage temp_trip) into the logged-in user's account
export async function importGuestTripAction(guestTrip) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Please log in first." };
  }

  const destination = (guestTrip?.destination || "").toString().trim();
  const startDate = (guestTrip?.startDate || "").toString().split("T")[0];
  const endDate = (guestTrip?.endDate || "").toString().split("T")[0];

  const validationError = validateTripInput(destination, startDate, endDate);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const tx = await db.transaction("write");
  try {
    const info = await tx.execute({
      sql: `
        INSERT INTO trips (destination, userId, startDate, endDate)
        VALUES (?, ?, ?, ?)
      `,
      args: [destination, Number(session.user.id), startDate, endDate],
    });
    const newTripId = Number(info.lastInsertRowid);

    const activitySql = `
      INSERT INTO activities (tripId, title, date, startTime, endTime, address, category, memo, lat, lon)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const memoSql = `
      INSERT INTO day_memos (tripId, date, memo)
      VALUES (?, ?, ?)
      ON CONFLICT(tripId, date) DO UPDATE SET memo = excluded.memo
    `;
    for (const day of (guestTrip.daysData || [])) {
      for (const a of (day.activities || [])) {
        if (!a?.title || !a?.startTime || !a?.endTime) continue;
        await tx.execute({
          sql: activitySql,
          args: [
            newTripId, a.title, a.date || day.date, a.startTime, a.endTime,
            a.address || "", a.category || "sightseeing", a.memo || "",
            a.lat ? Number(a.lat) : null, a.lon ? Number(a.lon) : null,
          ],
        });
      }
      if (day.memo) await tx.execute({ sql: memoSql, args: [newTripId, day.date, day.memo] });
    }

    const accommodationSql = `
      INSERT INTO accommodations (
        tripId, title, checkinDate, checkinTime,
        checkoutDate, checkoutTime, address, lat, lon, memo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    for (const acc of (guestTrip.accommodations || [])) {
      if (!acc?.title || !acc?.checkinDate || !acc?.checkoutDate) continue;
      await tx.execute({
        sql: accommodationSql,
        args: [
          newTripId, acc.title, acc.checkinDate, acc.checkinTime || "15:00",
          acc.checkoutDate, acc.checkoutTime || "10:00", acc.address || "",
          acc.lat ? Number(acc.lat) : null, acc.lon ? Number(acc.lon) : null,
          acc.memo || "",
        ],
      });
    }

    await tx.commit();
    revalidatePath('/');
    return { success: true, id: String(newTripId) };
  } catch (error) {
    await tx.rollback();
    console.error("Guest trip import error:", error);
    return { success: false, error: "Failed to import your guest plan." };
  }
}

//save the day memo
export async function saveDayMemoAction(tripId, date, memo) {
  if (!await requireTripOwner(tripId)) {
    return { success: false, error: "Unauthorized" };
  }
  try {
    await db.execute({
      sql: `
      INSERT INTO day_memos (tripId, date, memo)
      VALUES (?, ?, ?)
      ON CONFLICT(tripId, date) DO UPDATE SET memo = excluded.memo
    `,
      args: [tripId, date, memo],
    });
    revalidatePath(`/trips/${tripId}/weekly/${date}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

//create activity from AddActivityModal
export async function createActivityAction(tripId, activityData) {
  if (!await requireTripOwner(tripId)) {
    return { success: false, error: "Unauthorized" };
  }
  const validationError = validateActivityInput(activityData);
  if (validationError) {
    return { success: false, error: validationError };
  }
  const conflict = await findServerOverlap(tripId, activityData);
  if (conflict) {
    return { success: false, error: `Overlaps with "${conflict.title ?? "another activity"}" (${conflict.startTime}–${conflict.endTime}).` };
  }
  try {
    const { title, date, startTime, endTime, address, category = 'sightseeing', memo, lat, lon } = activityData;
    const info = await db.execute({
      sql: `
      INSERT INTO activities (tripId, title, date, startTime, endTime, address, category, memo, lat, lon)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      args: [
        tripId,
        title,
        date,
        startTime,
        endTime,
        address,
        category,
        memo,
        lat ? Number(lat) : null,
        lon ? Number(lon) : null,
      ],
    });

  revalidatePath(`/trips/${tripId}/weekly`);
  revalidatePath(`/trips/${tripId}/weekly/${date}`);
  return { success: true, id: Number(info.lastInsertRowid) };
  } catch(error){
    return { success: false, error: error.message }
  }
}

//update activity detail from ActivityDetailModal
export async function updateActivityAction(tripId, activityData) {
  if (!await requireTripOwner(tripId)) {
    return { success: false, error: "Unauthorized" };
  }
  const validationError = validateActivityInput(activityData);
  if (validationError) {
    return { success: false, error: validationError };
  }
  const conflict = await findServerOverlap(tripId, activityData, activityData.id);
  if (conflict) {
    return { success: false, error: `Overlaps with "${conflict.title ?? "another activity"}" (${conflict.startTime}–${conflict.endTime}).` };
  }
  try {
    const { id, title, date, startTime, endTime, address, category = 'sightseeing', memo, lat, lon } = activityData;

    const info = await db.execute({
      sql: `
      UPDATE activities
      SET title = ?,
          date = ?,
          startTime = ?,
          endTime = ?,
          address = ?,
          category = ?,
          memo = ?,
          lat = ?,
          lon = ?
      WHERE id = ? AND tripId = ?
    `,
      args: [
        title,
        date,
        startTime,
        endTime,
        address,
        category,
        memo,
        lat ? Number(lat) : null,
        lon ? Number(lon) : null,
        id,
        tripId,
      ],
    });

    if (info.rowsAffected === 0) {
      return { success: false, error: "Activity not found" };
    }

    revalidatePath(`/trips/${tripId}/weekly`);
    revalidatePath(`/trips/${tripId}/weekly/${date}`);
    return { success: true };
  } catch (error) {
    console.error("Database update error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteActivityAction(tripId, activityId){
  if (!await requireTripOwner(tripId)) {
    return { success: false, error: "Unauthorized" };
  }
  try{
    const result = await db.execute({
      sql: 'DELETE FROM activities WHERE id = ? AND tripId = ?',
      args: [activityId, tripId],
    });

    if(result.rowsAffected === 0){
      throw new Error("Activity not found or already deleted");
    }

    revalidatePath(`/trips/${tripId}/weekly`);
    return { success: true };
  }catch (error) {
    console.error("Database delete error:", error);
    return { success: false, error: error.message };
  }
}

// add new accommodation
export async function createAccommodationAction(tripId, accommodationData) {
  if (!await requireTripOwner(tripId)) {
    return { success: false, error: "Unauthorized" };
  }
  const validationError = validateAccommodationInput(accommodationData);
  if (validationError) {
    return { success: false, error: validationError };
  }
  const conflict = await findServerAccommodationOverlap(tripId, accommodationData);
  if (conflict) {
    return { success: false, error: `These dates overlap with "${conflict.title}" (${conflict.checkinDate} → ${conflict.checkoutDate}).` };
  }
  try{
    const {
      title,
      checkinDate,
      checkinTime,
      checkoutDate,
      checkoutTime,
      address,
      memo,
      lat,
      lon,
    } = accommodationData;

    const info = await db.execute({
      sql: `
      INSERT INTO accommodations (
        tripId, title, checkinDate, checkinTime,
        checkoutDate, checkoutTime, address, lat, lon, memo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      args: [
        tripId,
        title,
        checkinDate,
        checkinTime,
        checkoutDate,
        checkoutTime,
        address,
        lat ? Number(lat) : null,
        lon ? Number(lon) : null,
        memo,
      ],
    });

    revalidatePath(`/trips/${tripId}/`, 'layout');
    return { success: true, id: Number(info.lastInsertRowid) };
  } catch (error) {
    console.error("Database insert error (accommodation):", error);
    return { success: false, error: error.message };
  }
}

//update accommodation detail from AccommodationDetailModal
export async function updateAccommodationAction(tripId, accommodationData) {
  if (!await requireTripOwner(tripId)) {
    return { success: false, error: "Unauthorized" };
  }
  const validationError = validateAccommodationInput(accommodationData);
  if (validationError) {
    return { success: false, error: validationError };
  }
  const conflict = await findServerAccommodationOverlap(tripId, accommodationData, accommodationData.id);
  if (conflict) {
    return { success: false, error: `These dates overlap with "${conflict.title}" (${conflict.checkinDate} → ${conflict.checkoutDate}).` };
  }
  try {
    const { id, title, checkinDate, checkinTime, checkoutDate, checkoutTime, address, memo, lat, lon } = accommodationData;

    const info = await db.execute({
      sql: `
      UPDATE accommodations
      SET title = ?,
          checkinDate = ?,
          checkinTime = ?,
          checkoutDate = ?,
          checkoutTime = ?,
          address = ?,
          memo = ?,
          lat = ?,
          lon = ?
      WHERE id = ? AND tripId = ?
    `,
      args: [
        title,
        checkinDate,
        checkinTime,
        checkoutDate,
        checkoutTime,
        address,
        memo,
        lat ? Number(lat) : null,
        lon ? Number(lon) : null,
        id,
        tripId,
      ],
    });

    if (info.rowsAffected === 0) {
      return { success: false, error: "Accommodation not found" };
    }

    revalidatePath(`/trips/${tripId}/weekly`);
    return { success: true };
  } catch (error) {
    console.error("Database update error (accommodation):", error);
    return { success: false, error: error.message };
  }
}

//Delete a single trip
export async function deleteTripAction(tripId) {
  if (!await requireTripOwner(tripId)) {
    return { success: false, error: "Unauthorized" };
  }
  // libSQL over HTTP can't rely on `PRAGMA foreign_keys = ON` persisting across
  // requests, so delete child rows explicitly inside a transaction instead of
  // depending on ON DELETE CASCADE.
  const tx = await db.transaction("write");
  try {
    await tx.execute({ sql: 'DELETE FROM activities WHERE tripId = ?', args: [tripId] });
    await tx.execute({ sql: 'DELETE FROM day_memos WHERE tripId = ?', args: [tripId] });
    await tx.execute({ sql: 'DELETE FROM accommodations WHERE tripId = ?', args: [tripId] });
    await tx.execute({ sql: 'DELETE FROM trips WHERE id = ?', args: [tripId] });
    await tx.commit();
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    await tx.rollback();
    return { success: false, error: error.message };
  }
}

//Delete all trips for the current user
export async function deleteAllTripsAction() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  const userId = Number(session.user.id);
  // Explicit cascade (see deleteTripAction for why CASCADE isn't relied on).
  const tx = await db.transaction("write");
  try {
    await tx.execute({ sql: 'DELETE FROM activities WHERE tripId IN (SELECT id FROM trips WHERE userId = ?)', args: [userId] });
    await tx.execute({ sql: 'DELETE FROM day_memos WHERE tripId IN (SELECT id FROM trips WHERE userId = ?)', args: [userId] });
    await tx.execute({ sql: 'DELETE FROM accommodations WHERE tripId IN (SELECT id FROM trips WHERE userId = ?)', args: [userId] });
    await tx.execute({ sql: 'DELETE FROM trips WHERE userId = ?', args: [userId] });
    await tx.commit();
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    await tx.rollback();
    return { success: false, error: error.message };
  }
}

//Delete accommodation
export async function deleteAccommodationAction(tripId, accommodationId) {
  if (!await requireTripOwner(tripId)) {
    return { success: false, error: "Unauthorized" };
  }
  try {
    const result = await db.execute({
      sql: 'DELETE FROM accommodations WHERE id = ? AND tripId = ?',
      args: [accommodationId, tripId],
    });

    if (result.rowsAffected === 0) {
      throw new Error("Accommodation not found or already deleted");
    }

    revalidatePath(`/trips/${tripId}/weekly`);
    return { success: true };
  } catch (error) {
    console.error("Database delete error (accommodation):", error);
    return { success: false, error: error.message };
  }
}
