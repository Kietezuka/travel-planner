import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from '../../auth/[...nextauth]/route';
import db from "../../../../lib/db";

export async function GET(request, { params }) {
    // Next.js 15+ requires awaiting params before use
    const { id } = await params;
    
    const session = await getServerSession(authOptions);
    
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    const trip = (await db.execute({
        sql: 'SELECT * FROM trips WHERE id = ?',
        args: [id],
    })).rows[0];

    if (!trip) {
        return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const isOwner = session?.user?.id && Number(trip.userId) === Number(session.user.id);

    // Only the trip's owner may read it — guards against IDOR
    if (!isOwner) {
        return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

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