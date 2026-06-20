import { NextResponse } from "next/server";

const RELAY_URL = "https://oddslab-relay.onrender.com/api/odds"; // ← your actual Render URL

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const fixture = searchParams.get("fixture");

    if (!fixture) {
        return NextResponse.json(
            { error: "Missing required query param: fixture" },
            { status: 400 }
        );
    }

    try {
        const relayResponse = await fetch(`${RELAY_URL}?fixture=${encodeURIComponent(fixture)}`);

        if (!relayResponse.ok) {
            const text = await relayResponse.text();
            return NextResponse.json(
                { error: `Relay error: ${relayResponse.status}`, detail: text },
                { status: relayResponse.status }
            );
        }

        const data = await relayResponse.json();
        return NextResponse.json(data);
    } catch (err) {
        console.error("[/api/odds] Relay fetch failed:", err);
        return NextResponse.json(
            { error: "Failed to reach relay", detail: err.message },
            { status: 500 }
        );
    }
}