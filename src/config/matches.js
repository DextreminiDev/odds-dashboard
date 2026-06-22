// src/config/matches.js
import slugs from "./matchSlugs.json";

export const MATCH_SLUGS = slugs;

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
        homeScore: fixture.eventStatus?.homeScore ?? null,
        awayScore: fixture.eventStatus?.awayScore ?? null,
        stats: fixture.eventStatus?.statistic ?? null,
    };
}

const CONCLUDED_STATUSES = ["ended", "closed", "finished", "complete", "completed"];
const KICKOFF_CUTOFF_MS = 3 * 60 * 60 * 1000; // 3 hours

export function classifyMatch(apiResponse) {
    if (!apiResponse) return "invalid";
    const fixture = apiResponse?.data?.slugFixture;
    if (!fixture) return "invalid";

    const status = (fixture.status ?? fixture.eventStatus?.matchStatus ?? "").toLowerCase();
    if (CONCLUDED_STATUSES.includes(status)) return "concluded";

    if (typeof fixture.marketCount === "number" && fixture.marketCount === 0) return "concluded";

    const kickoff = fixture.data?.startTime;
    if (kickoff && Date.now() - new Date(kickoff).getTime() > KICKOFF_CUTOFF_MS) return "concluded";

    return "live";
}
