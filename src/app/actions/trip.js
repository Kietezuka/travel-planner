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
  const trip = db.prepare('SELECT userId FROM trips WHERE id = ?').get(tripId);
  if (!trip || Number(trip.userId) !== Number(session.user.id)) return null;
  return session;
}

// The server is the source of truth for overlaps — client checks are UX only.
function findServerOverlap(tripId, activity, excludeId = null) {
  const existing = db.prepare(
    'SELECT id, title, startTime, endTime FROM activities WHERE tripId = ? AND date = ?'
  ).all(tripId, activity.date);
  return findOverlappingActivity(existing, activity.startTime, activity.endTime, excludeId);
}

function findServerAccommodationOverlap(tripId, acc, excludeId = null) {
  const existing = db.prepare(
    'SELECT id, title, checkinDate, checkinTime, checkoutDate, checkoutTime FROM accommodations WHERE tripId = ?'
  ).all(tripId);
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
    const stmt = db.prepare(`
      INSERT INTO trips (destination, userId, startDate, endDate)
      VALUES (?, ?, ?, ?)
    `);

    const info = stmt.run(destination, Number(userId), startDate, endDate);

    newTripId = info.lastInsertRowid;
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

  try {
    let newTripId;
    db.transaction(() => {
      const info = db.prepare(`
        INSERT INTO trips (destination, userId, startDate, endDate)
        VALUES (?, ?, ?, ?)
      `).run(destination, Number(session.user.id), startDate, endDate);
      newTripId = info.lastInsertRowid;

      const insertActivity = db.prepare(`
        INSERT INTO activities (tripId, title, date, startTime, endTime, address, category, memo, lat, lon)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertMemo = db.prepare(`
        INSERT INTO day_memos (tripId, date, memo)
        VALUES (?, ?, ?)
        ON CONFLICT(tripId, date) DO UPDATE SET memo = excluded.memo
      `);
      for (const day of (guestTrip.daysData || [])) {
        for (const a of (day.activities || [])) {
          if (!a?.title || !a?.startTime || !a?.endTime) continue;
          insertActivity.run(
            newTripId, a.title, a.date || day.date, a.startTime, a.endTime,
            a.address || "", a.category || "sightseeing", a.memo || "",
            a.lat ? Number(a.lat) : null, a.lon ? Number(a.lon) : null
          );
        }
        if (day.memo) insertMemo.run(newTripId, day.date, day.memo);
      }

      const insertAccommodation = db.prepare(`
        INSERT INTO accommodations (
          tripId, title, checkinDate, checkinTime,
          checkoutDate, checkoutTime, address, lat, lon, memo
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const acc of (guestTrip.accommodations || [])) {
        if (!acc?.title || !acc?.checkinDate || !acc?.checkoutDate) continue;
        insertAccommodation.run(
          newTripId, acc.title, acc.checkinDate, acc.checkinTime || "15:00",
          acc.checkoutDate, acc.checkoutTime || "10:00", acc.address || "",
          acc.lat ? Number(acc.lat) : null, acc.lon ? Number(acc.lon) : null,
          acc.memo || ""
        );
      }
    })();

    revalidatePath('/');
    return { success: true, id: String(newTripId) };
  } catch (error) {
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
    const stmt = db.prepare(`
      INSERT INTO day_memos (tripId, date, memo)
      VALUES (?, ?, ?)
      ON CONFLICT(tripId, date) DO UPDATE SET memo = excluded.memo
    `);
    stmt.run(tripId, date, memo);
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
  const conflict = findServerOverlap(tripId, activityData);
  if (conflict) {
    return { success: false, error: `Overlaps with "${conflict.title ?? "another activity"}" (${conflict.startTime}–${conflict.endTime}).` };
  }
  try {
    const { title, date, startTime, endTime, address, category = 'sightseeing', memo, lat, lon } = activityData;
    const stmt = db.prepare(`
      INSERT INTO activities (tripId, title, date, startTime, endTime, address, category, memo, lat, lon)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

  const info = stmt.run(
    tripId,
    title,
    date,
    startTime,
    endTime,
    address,
    category,
    memo,
    lat ? Number(lat) : null,
    lon ? Number(lon) : null
  );

  revalidatePath(`/trips/${tripId}/weekly`);
  revalidatePath(`/trips/${tripId}/weekly/${date}`);
  return { success: true, id: info.lastInsertRowid };
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
  const conflict = findServerOverlap(tripId, activityData, activityData.id);
  if (conflict) {
    return { success: false, error: `Overlaps with "${conflict.title ?? "another activity"}" (${conflict.startTime}–${conflict.endTime}).` };
  }
  try {
    const { id, title, date, startTime, endTime, address, category = 'sightseeing', memo, lat, lon } = activityData;

    const stmt = db.prepare(`
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
    `);

    const info = stmt.run(
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
      tripId
    );

    if (info.changes === 0) {
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
    const stmt = db.prepare('DELETE FROM activities WHERE id = ? AND tripId = ?');
    const result = stmt.run(activityId, tripId);

    if(result.changes === 0){
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
  const conflict = findServerAccommodationOverlap(tripId, accommodationData);
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

    const stmt = db.prepare(`
      INSERT INTO accommodations (
        tripId, title, checkinDate, checkinTime, 
        checkoutDate, checkoutTime, address, lat, lon, memo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      tripId,
      title,
      checkinDate,
      checkinTime,
      checkoutDate,
      checkoutTime,
      address,
      lat ? Number(lat) : null,
      lon ? Number(lon) : null,
      memo
    );

    revalidatePath(`/trips/${tripId}/`, 'layout');
    return { success: true, id: info.lastInsertRowid };
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
  const conflict = findServerAccommodationOverlap(tripId, accommodationData, accommodationData.id);
  if (conflict) {
    return { success: false, error: `These dates overlap with "${conflict.title}" (${conflict.checkinDate} → ${conflict.checkoutDate}).` };
  }
  try {
    const { id, title, checkinDate, checkinTime, checkoutDate, checkoutTime, address, memo, lat, lon } = accommodationData;
    
    const stmt = db.prepare(`
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
    `);

    const info = stmt.run(
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
      tripId
    );

    if (info.changes === 0) {
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
  try {
    // Child rows (day_memos / activities / accommodations) are removed by
    // ON DELETE CASCADE. Requires foreign_keys = ON, set in lib/db.js.
    db.prepare('DELETE FROM trips WHERE id = ?').run(tripId);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

//Delete all trips for the current user
export async function deleteAllTripsAction() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  try {
    const userId = Number(session.user.id);
    // Children cascade-delete via ON DELETE CASCADE (foreign_keys = ON in lib/db.js).
    db.prepare('DELETE FROM trips WHERE userId = ?').run(userId);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

//Delete accommodation
export async function deleteAccommodationAction(tripId, accommodationId) {
  if (!await requireTripOwner(tripId)) {
    return { success: false, error: "Unauthorized" };
  }
  try {
    const stmt = db.prepare('DELETE FROM accommodations WHERE id = ? AND tripId = ?');
    const result = stmt.run(accommodationId, tripId);

    if (result.changes === 0) {
      throw new Error("Accommodation not found or already deleted");
    }

    revalidatePath(`/trips/${tripId}/weekly`);
    return { success: true };
  } catch (error) {
    console.error("Database delete error (accommodation):", error);
    return { success: false, error: error.message };
  }
}