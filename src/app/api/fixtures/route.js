// src/app/api/fixtures/route.js
// Fetches the FIFA World Cup fixture list by scraping Stake's SSR page HTML.
// Stake renders fixture data into __NEXT_DATA__ on the page — no separate
// GraphQL endpoint exists for this. We forward the browser's cf_clearance
// cookie so Cloudflare lets the request through.
//
// Usage: GET /api/fixtures?sport=soccer&category=international&tournament=world-cup

import { NextResponse } from "next/server";

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const sport       = searchParams.get("sport")       ?? "soccer";
    const category    = searchParams.get("category")    ?? "international";
    const tournament  = searchParams.get("tournament")  ?? "world-cup";

    const pageUrl = `https://stake.com/sports/${sport}/${category}/${tournament}`;

    // Forward the browser's cookies (especially cf_clearance + __cf_bm)
    // so Cloudflare doesn't 403 us.
    const cookieHeader = request.headers.get("cookie") ?? "";

    try {
        const res = await fetch(pageUrl, {
            method: "GET",
            headers: {
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Cache-Control": "no-cache",
                "Cookie": cookieHeader,
                "Referer": "https://stake.com/sports/soccer",
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
            },
            // Don't follow redirects to waitingroom
            redirect: "manual",
        });

        if (res.status === 403 || res.status === 503) {
            return NextResponse.json(
                { error: `Stake returned ${res.status} — cf_clearance may be expired`, fixtures: [] },
                { status: res.status }
            );
        }

        // Cloudflare waiting room redirect
        if (res.status >= 300 && res.status < 400) {
            return NextResponse.json(
                { error: "Stake waiting room redirect — try again shortly", fixtures: [] },
                { status: 503 }
            );
        }

        if (!res.ok) {
            return NextResponse.json(
                { error: `Stake page returned ${res.status}`, fixtures: [] },
                { status: res.status }
            );
        }

        const html = await res.text();

        // Extract the __NEXT_DATA__ JSON blob Stake embeds in every SSR page
        const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
        if (!match) {
            return NextResponse.json(
                { error: "Could not find __NEXT_DATA__ on Stake page", fixtures: [] },
                { status: 500 }
            );
        }

        const nextData = JSON.parse(match[1]);

        // Drill into the page props to find the fixture list.
        // Stake's path: props.pageProps.initialApolloState or props.pageProps.fixtures
        // We try several known paths.
        const pageProps = nextData?.props?.pageProps ?? {};

        let fixtures = [];

        // Path 1: direct fixtures array on pageProps
        if (Array.isArray(pageProps.fixtures)) {
            fixtures = pageProps.fixtures;
        }
        // Path 2: initialApolloState — walk all keys looking for fixture objects
        else if (pageProps.initialApolloState) {
            fixtures = extractFixturesFromApolloState(pageProps.initialApolloState, tournament);
        }
        // Path 3: dehydratedState (React Query / SWR pattern)
        else if (pageProps.dehydratedState) {
            fixtures = extractFixturesFromDehydrated(pageProps.dehydratedState, tournament);
        }

        if (fixtures.length === 0) {
            // Debug: return the top-level pageProps keys so we can find the right path
            return NextResponse.json({
                error: "Found __NEXT_DATA__ but could not locate fixtures — see debug",
                fixtures: [],
                debug: {
                    pagePropsKeys: Object.keys(pageProps),
                    sample: JSON.stringify(pageProps).slice(0, 500),
                },
            });
        }

        return NextResponse.json({ fixtures, count: fixtures.length });
    } catch (err) {
        console.error("[/api/fixtures] Failed:", err);
        return NextResponse.json(
            { error: err.message, fixtures: [] },
            { status: 500 }
        );
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function normaliseFixture(f) {
    const matchData = f.data?.__typename === "SportFixtureDataMatch" ? f.data : null;
    const competitors = matchData?.competitors ?? f.competitors ?? [];
    const home = competitors[0]?.name ?? f.name ?? "";
    const away = competitors[1]?.name ?? "";
    return {
        id:             f.slug,
        fixtureId:      f.id,
        label:          f.name,
        home,
        away,
        status:         f.status,
        kickoff:        matchData?.startTime ?? f.startTime ?? null,
        tournament:     f.tournament?.name ?? "World Cup",
    };
}

function extractFixturesFromApolloState(state, tournamentSlug) {
    // Apollo normalises objects as ROOT_QUERY / SportFixture:id etc.
    const fixtures = [];
    for (const [key, val] of Object.entries(state)) {
        if (
            key.startsWith("SportFixture:") &&
            val?.slug &&
            val.slug.length > 10 &&
            val?.tournament?.slug === tournamentSlug
        ) {
            fixtures.push(normaliseFixture(val));
        }
    }
    return fixtures;
}

function extractFixturesFromDehydrated(state, tournamentSlug) {
    const fixtures = [];
    try {
        const queries = state?.queries ?? [];
        for (const q of queries) {
            const data = q?.state?.data;
            if (!data) continue;
            // Walk recursively looking for objects with a slug matching fixture pattern
            walkForFixtures(data, tournamentSlug, fixtures);
        }
    } catch (_) {}
    return fixtures;
}

function walkForFixtures(obj, tournamentSlug, acc, depth = 0) {
    if (depth > 8 || !obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
        for (const item of obj) walkForFixtures(item, tournamentSlug, acc, depth + 1);
        return;
    }
    // Looks like a fixture? Has slug + name + status
    if (
        obj.slug &&
        obj.name &&
        obj.status &&
        /^\d{6,}-/.test(obj.slug)    // fixture slugs start with a numeric id
    ) {
        acc.push(normaliseFixture(obj));
        return;
    }
    for (const val of Object.values(obj)) {
        walkForFixtures(val, tournamentSlug, acc, depth + 1);
    }
}