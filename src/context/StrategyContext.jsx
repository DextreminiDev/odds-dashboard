"use client";

import { createContext, useContext, useRef, useState, useCallback } from "react";
import { allocate } from "@/utils/strategyMath";

const StrategyContext = createContext(null);

export function StrategyProvider({ children }) {
    // Fixture cache lives here so both pages share it
    const cache = useRef(new Map());

    const [manualBets, setManualBets] = useState([]);
    const [allocatedBets, setAllocatedBets] = useState([]);

    const [selectedId, setSelectedId] = useState(null);

    function getSelectedFixture() {
        if (!selectedId) return null;
        return cache.current.get(selectedId) ?? null;
    }

    // Expose cache.current as a stable ref accessor
    const getCache = useCallback(() => cache.current, []);

    function addToCache(matchId, data) {
        cache.current.set(matchId, data);
    }

    function isCached(matchId) {
        return cache.current.has(matchId);
    }

    function addManual(bet) {
        setManualBets((prev) => {
            const idx = prev.findIndex((b) => b.outcomeId === bet.outcomeId);
            if (idx >= 0) {
                const next = [...prev];
                next[idx] = bet;
                return next;
            }
            return [...prev, bet];
        });
    }

    function removeManual(outcomeId) {
        setManualBets((prev) => prev.filter((b) => b.outcomeId !== outcomeId));
    }

    function updateManualStake(outcomeId, newStake) {
        setManualBets((prev) =>
            prev.map((b) => b.outcomeId === outcomeId ? { ...b, stake: newStake } : b)
        );
    }

    function generate({ availableBankroll, risk, targetMatchIds, targetTabs, bankroll }) {
        const manualIds = new Set(manualBets.map((b) => b.outcomeId));
        const candidates = [];

        const matchIds = targetMatchIds.length > 0
            ? targetMatchIds
            : [...cache.current.keys()];

        for (const matchId of matchIds) {
            const raw = cache.current.get(matchId);
            if (!raw) continue;
            const fixture = raw?.data?.slugFixture;
            if (!fixture) continue;

            for (const group of fixture.group ?? []) {
                if (targetTabs.length > 0 && !targetTabs.includes(group.name)) continue;
                for (const template of group.templates ?? []) {
                    for (const market of template.markets ?? []) {
                        if (market.status !== "active") continue;
                        for (const outcome of market.outcomes ?? []) {
                            if (!outcome.active || manualIds.has(outcome.id)) continue;
                            candidates.push({
                                outcomeId: outcome.id,
                                outcomeName: outcome.name,
                                odds: outcome.odds,
                                marketName: market.name,
                                matchLabel: fixture.name,
                                matchId,
                                groupName: group.name,
                            });
                        }
                    }
                }
            }
        }

        const maxPicks = targetTabs.length > 0
            ? Math.min(Math.max(targetTabs.length, 2), 6)
            : 2;
        setAllocatedBets(allocate(candidates, availableBankroll, risk, maxPicks));
    }

    function clearAll() {
        setAllocatedBets([]);
        setManualBets([]);
    }

    return (
        <StrategyContext.Provider value={{
            getCache, addToCache, isCached,
            manualBets, addManual, removeManual, updateManualStake,
            allocatedBets, generate,
            clearAll,
            selectedId, setSelectedId, getSelectedFixture,
        }}>
            {children}
        </StrategyContext.Provider>
    );
}

export function useStrategy() {
    const ctx = useContext(StrategyContext);
    if (!ctx) throw new Error("useStrategy must be used inside StrategyProvider");
    return ctx;
}