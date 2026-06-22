// strategyMath.js
// Pure functions: no React, no side effects.

/**
 * Given a list of outcomes with .odds, apply Dutching:
 * each bet's stake = (totalStake / odds) / sum(1/odds)  ... scaled so
 * the total outlay equals totalStake and each winning leg returns the same profit.
 */
export function dutch(outcomes, totalStake) {
    const invOdds = outcomes.map((o) => 1 / o.odds);
    const sumInv = invOdds.reduce((a, b) => a + b, 0);
    return outcomes.map((o, i) => ({
        ...o,
        stake: (invOdds[i] / sumInv) * totalStake,
        expectedReturn: ((invOdds[i] / sumInv) * totalStake) * o.odds,
    }));
}

/**
 * Proportional Kelly-lite: weight by implied probability, cap at maxFraction of bankroll.
 */
export function proportionalSpread(outcomes, totalStake) {
    const probs = outcomes.map((o) => 1 / o.odds);
    const sumProbs = probs.reduce((a, b) => a + b, 0);
    return outcomes.map((o, i) => ({
        ...o,
        stake: (probs[i] / sumProbs) * totalStake,
        expectedReturn: ((probs[i] / sumProbs) * totalStake) * o.odds,
    }));
}

/**
 * Core strategy allocator.
 * @param {object[]} candidates  - flat array of outcome objects with .odds, .name, .marketName, .matchLabel
 * @param {number}   bankroll    - available bankroll after manual bets
 * @param {number}   risk        - 1–10
 * @param {number}   maxPicks    - max picks for speculative/spread tiers (default 2)
 * @returns {object[]}           - allocated bets with .stake and .expectedReturn
 */
export function allocate(candidates, bankroll, risk, maxPicks = 2) {
    if (!candidates.length || bankroll <= 0) return [];

    if (risk <= 3) {
        // Hedge / Dutching: 1 fav (odds 1.15–1.40) + 1 underdog (4.0+)
        const favs = candidates.filter((o) => o.odds >= 1.15 && o.odds <= 1.40);
        const dogs = candidates.filter((o) => o.odds >= 4.0);
        const fav = favs.sort((a, b) => a.odds - b.odds)[0];
        const dog = dogs.sort((a, b) => a.odds - b.odds)[0];
        const picks = [fav, dog].filter(Boolean);
        if (!picks.length) return fallback(candidates, bankroll, risk);
        return dutch(picks, bankroll);
    }

    if (risk <= 7) {
        // +EV spread: 2–4 outcomes, odds 1.70–2.50, proportional
        const pool = candidates
            .filter((o) => o.odds >= 1.70 && o.odds <= 2.50)
            .sort((a, b) => (1 / a.odds) - (1 / b.odds)) // highest implied prob first
            .slice(0, Math.max(maxPicks, 4));
        if (!pool.length) return fallback(candidates, bankroll, risk);
        return proportionalSpread(pool, bankroll);
    }

    // Risk 8–10: speculative — high-odds picks scaled to maxPicks
    const pool = candidates
        .filter((o) => o.odds >= 3.50)
        .sort((a, b) => b.odds - a.odds)
        .slice(0, maxPicks);
    if (!pool.length) return fallback(candidates, bankroll, risk);
    // All-in split: equal allocation
    return pool.map((o) => ({
        ...o,
        stake: bankroll / pool.length,
        expectedReturn: (bankroll / pool.length) * o.odds,
    }));
}

function fallback(candidates, bankroll, risk) {
    // Graceful degradation: just pick the best odds candidates proportionally
    const pool = [...candidates]
        .sort((a, b) => (risk <= 5 ? a.odds - b.odds : b.odds - a.odds))
        .slice(0, 3);
    return proportionalSpread(pool, bankroll);
}

/**
 * Build scenario matrix from an array of allocated bets.
 * Returns all 2^n win/loss combos, each with net P&L.
 * Caps at 2^6 = 64 combos to avoid explosions.
 */
export function buildScenarioMatrix(bets) {
    if (!bets.length) return [];
    const capped = bets.slice(0, 6);
    const n = capped.length;
    const scenarios = [];

    for (let mask = 0; mask < 2 ** n; mask++) {
        let pnl = 0;
        const outcomes = [];
        for (let i = 0; i < n; i++) {
            const won = (mask >> i) & 1;
            const bet = capped[i];
            pnl += won ? bet.expectedReturn - bet.stake : -bet.stake;
            outcomes.push({ ...bet, won: !!won });
        }
        let probability = 1;
        for (let i = 0; i < n; i++) {
            const won = (mask >> i) & 1;
            const implied = 1 / capped[i].odds;
            probability *= won ? implied : 1 - implied;
        }
        scenarios.push({ outcomes, pnl, winsCount: outcomes.filter((o) => o.won).length, probability });
    }

    return scenarios.sort((a, b) => b.pnl - a.pnl);
}

export function calcStrategyEV(scenarios) {
    if (!scenarios.length) return null;
    return scenarios.reduce((sum, s) => sum + s.probability * s.pnl, 0);
}

/** Format a number as a dollar string */
export function fmt$(n) {
    if (n == null) return "—";
    const sign = n >= 0 ? "+" : "";
    return `${sign}$${Math.abs(n).toFixed(2)}`;
}