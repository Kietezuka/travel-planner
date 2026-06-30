import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from '../../auth/[...nextauth]/route';
import db from "../../../../lib/db";

export async function GET(request, { params }) {
    // 1. Await params (Next.js 15 requirement)
    const { id } = await params;
    
    // 2. Security: Check who is asking
    const session = await getServerSession(authOptions);
    
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    // 3. Fetch the trip
    const trip = (await db.execute({
        sql: 'SELECT * FROM trips WHERE id = ?',
        args: [id],
    })).rows[0];

    if (!trip) {
        return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const isOwner = session?.user?.id && Number(trip.userId) === Number(session.user.id);

    // 4. Authorization Check: Does the userId match the session?
    if (!isOwner) {
        return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    // 5. Fetch linked data
    const accommodations = (await db.execute({
        sql: 'SELECT * FROM accommodations WHERE tripId = ?',
        args: [id],
    })).rows;

    let activities;
    let dayMemo = "";

    if (date) {
        // Specific day view
        activities = (await db.execute({
            sql: 'SELECT * FROM activities WHERE tripId = ? AND date = ?',
            args: [id, date],
        })).rows;
        const memoRow = (await db.execute({
            sql: 'SELECT memo FROM day_memos WHERE tripId = ? AND date = ?',
            args: [id, date],
        })).rows[0];
        dayMemo = memoRow ? memoRow.memo : "";
    } else {
        // Weekly view
        activities = (await db.execute({
            sql: 'SELECT * FROM activities WHERE tripId = ?',
            args: [id],
        })).rows;
    }

    return NextResponse.json({ 
        ...trip, 
        activities, 
        accommodations, 
        dayMemo 
    });
}