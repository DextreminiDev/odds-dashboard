// /src/app/api/odds/route.js
// Proxy route: receives a fixture slug, forwards GraphQL request to Stake.com,
// returns the raw JSON response. Keeps credentials server-side only.

import { NextResponse } from "next/server";

const STAKE_GRAPHQL_URL = "https://stake.com/_api/graphql";

const GROUPS = [
    "main",
    "goals",
    "AsianLines",
    "1st2ndhalfmarkets",
    "half",
    "goalscorers",
    "players",
    "corners",
    "cards",
    "specials",
    "MinuteMarkets",
];

function buildQuery(fixtureSlug) {
    return {
        query: `query FixtureIndex($fixture: String!, $groups: [String!]!) {
  slugFixture(fixture: $fixture) {
    ...SportFixtureView
    groups { id ...SportGroup }
    maps: groups(groups: ["maps"]) {
      id ...SportGroup
      templates(includeEmpty: false) {
        id extId
        markets { status specifiers extId }
      }
    }
    ...UfcFrontRowSeat
    group: groups(groups: $groups) {
      ...SportGroup
      templates(includeEmpty: false) {
        id ...SportGroupTemplate
        markets {
          ...SportMarket
          outcomes { ...SportMarketOutcome extId }
        }
      }
    }
  }
}

fragment SportFixtureView on SportFixture {
  ...SportFixtureLiveStreamExists
  id slug extId status name provider widgetUrl liveWidgetUrl
  customBetAvailable swishGame { id status swishSportId customBetEnabled }
  eventStatus { ...SportFixtureEventStatus ...EsportFixtureEventStatus __typename }
  data { ...SportFixtureDataMatch ...SportFixtureDataOutright __typename }
  contentNotes { ...ContentNote }
  tournament {
    id name slug
    contentNotes { ...ContentNote }
    category {
      id name slug
      contentNotes { ...ContentNote }
      sport { id name slug contentNotes { ...ContentNote } }
    }
  }
}

fragment SportFixtureLiveStreamExists on SportFixture {
  id
  betradarStream { exists }
  liveStream { data { isAvailable } }
}

fragment SportFixtureEventStatus on SportFixtureEventStatusData {
  __typename homeScore awayScore matchStatus
  clock { matchTime remainingTime }
  periodScores { homeScore awayScore matchStatus }
  currentTeamServing homeGameScore awayGameScore
  statistic {
    yellowCards { away home }
    redCards { away home }
    corners { home away }
  }
}

fragment EsportFixtureEventStatus on EsportFixtureEventStatus {
  matchStatus homeScore awayScore
  scoreboard {
    homeGold awayGold homeGoals awayGoals homeKills awayKills gameTime
    homeDestroyedTowers awayDestroyedTowers homeDestroyedTurrets awayDestroyedTurrets
    currentRound currentCtTeam currentDefTeam time awayWonRounds homeWonRounds remainingGameTime
  }
  periodScores {
    type number awayGoals awayKills awayScore homeGoals homeKills homeScore
    awayWonRounds homeWonRounds matchStatus
  }
  __typename
}

fragment SportFixtureDataMatch on SportFixtureDataMatch {
  startTime isOutright
  competitors { ...SportFixtureCompetitor }
  teams { extId name qualifier }
  tvChannels { language name streamUrl }
  __typename
}

fragment SportFixtureCompetitor on SportFixtureCompetitor {
  name defaultName extId countryCode abbreviation iconPath
}

fragment SportFixtureDataOutright on SportFixtureDataOutright {
  isOutright name startTime endTime __typename
}

fragment ContentNote on ContentNote {
  id createdAt publishAt expireAt linkText linkUrl message locale
  ref {
    ... on Sport { id name }
    ... on SportCategory { id name sport { name } }
    ... on SportTournament { id name category { name sport { name } } }
    ... on SportFixture {
      id name provider
      tournament { name category { name sport { name } } }
    }
  }
}

fragment SportGroup on SportGroup { name translation rank }
fragment UfcFrontRowSeat on SportFixture {
  frontRowSeatFight { fightId }
  tournament { frontRowSeatEvent { identifier } }
}
fragment SportGroupTemplate on SportGroupTemplate { extId rank name }
fragment SportMarket on SportMarket {
  id name status extId specifiers customBetAvailable provider templateExtId
}
fragment SportMarketOutcome on SportMarketOutcome {
  __typename id active odds name customBetAvailable
}`,
        variables: {
            fixture: fixtureSlug,
            groups: GROUPS,
        },
    };
}

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
        const stakeResponse = await fetch(STAKE_GRAPHQL_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "*/*",
                "accept-language": "en-US,en;q=0.9",
                origin: "https://stake.com",
                referer: `https://stake.com/sports/soccer/international/world-cup/${fixture}`,
                "x-language": "en",
                "user-agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
            },
            body: JSON.stringify(buildQuery(fixture)),
        });

        if (!stakeResponse.ok) {
            const text = await stakeResponse.text();
            return NextResponse.json(
                { error: `Stake API error: ${stakeResponse.status}`, detail: text },
                { status: stakeResponse.status }
            );
        }

        const data = await stakeResponse.json();
        return NextResponse.json(data);
    } catch (err) {
        console.error("[/api/odds] Fetch failed:", err);
        return NextResponse.json(
            { error: "Failed to reach Stake API", detail: err.message },
            { status: 500 }
        );
    }
}
