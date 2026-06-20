// src/config/matches.js
import slugs from "./matchSlugs.json";

export const MATCH_SLUGS = slugs;

/**
 * Derives display metadata from a fetched fixture's raw API response.
 * Called once per match, right after its first successful validation fetch.
 */
export function deriveMatchMeta(slug, apiResponse) {
    const fixture = apiResponse?.data?.slugFixture;
    if (!fixture) return null;

    const competitors = fixture.data?.competitors ?? [];
    return {
        id: slug,
        home: competitors[0]?.name ?? "Home",
        away: competitors[1]?.name ?? "Away",
        tournament: fixture.tournament?.name ?? "World Cup",
        kickoff: fixture.data?.startTime ?? null,
        status: fixture.status ?? fixture.eventStatus?.matchStatus ?? null,
    };
}

const CONCLUDED_STATUSES = ["ended", "closed", "finished", "complete", "completed"];

export function isMatchValid(apiResponse) {
    if (!apiResponse) return false;
    const fixture = apiResponse?.data?.slugFixture;
    if (!fixture) return false;

    // Signal 1: explicit status string (confirmed via real API response — "ended")
    const status = (fixture.status ?? fixture.eventStatus?.matchStatus ?? "").toLowerCase();
    if (CONCLUDED_STATUSES.includes(status)) return false;

    // Signal 2: zero open markets — currently inert in production since
    // /api/odds/route.js's GraphQL query doesn't request marketCount, but
    // safe to keep as a guard in case that query is ever extended to include it.
    if (typeof fixture.marketCount === "number" && fixture.marketCount === 0) return false;

    return true;
}
