import { NextResponse } from "next/server";

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const type = searchParams.get("type") || "address";

    // 2 chars minimum so 2-character place names
    if (q.length < 2) {
        return NextResponse.json([]);
    }

    const params = new URLSearchParams({
        format: "json",
        q,
        addressdetails: "1",
        "accept-language": "en",
        // destination search filters client-side by place type, so it needs
        // a wider net; plain address lookups only ever show 10
        limit: type === "destination" ? "50" : "10",
    });
    if (type === "destination") {
        params.set("featuretype", "settlement");
    }

    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
            headers: {
                "User-Agent": "TravelPlannerApp/1.0 (https://github.com/Kietezuka)",
            },
            // Nominatim results barely change; let Next cache identical queries briefly
            next: { revalidate: 3600 },
        });
        if (!res.ok) {
            return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
        }
        const data = await res.json();
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
    }
}
