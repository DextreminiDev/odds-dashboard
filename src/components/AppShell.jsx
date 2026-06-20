"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useCallback, useEffect, useRef } from "react";
import { useStrategy } from "@/context/StrategyContext";
import StrategyEngine from "./StrategyEngine";
import { MATCH_SLUGS, deriveMatchMeta, isMatchValid } from "@/config/matches";

const BATCH_SIZE = 10;
const STAGGER_MS = 150;

function sortByKickoff(matches) {
    return [...matches].sort((a, b) => {
        const aTime = a.kickoff ? new Date(a.kickoff).getTime() : Infinity;
        const bTime = b.kickoff ? new Date(b.kickoff).getTime() : Infinity;
        return aTime - bTime;
    });
}

export default function AppShell({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const { manualBets, allocatedBets, removeManual, generate, getCache, isCached, addToCache, selectedId, setSelectedId } = useStrategy();

    const [targetMatchIds, setTargetMatchIds] = useState([]);
    const [strategyOpen, setStrategyOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const totalBets = manualBets.length + allocatedBets.length;

    // ── Batch-on-demand match validation ──
    const [matches, setMatches] = useState([]);
    const [loadedCount, setLoadedCount] = useState(0);
    const [batchLoading, setBatchLoading] = useState(false);

    const hasMore = loadedCount < MATCH_SLUGS.length;

    const loadNextBatch = useCallback(async () => {
        if (batchLoading || !hasMore) return;
        setBatchLoading(true);

        const slice = MATCH_SLUGS.slice(loadedCount, loadedCount + BATCH_SIZE);
        const newlyValid = [];

        for (let i = 0; i < slice.length; i++) {
            const slug = slice[i];
            try {
                const res = await fetch(`/api/odds?fixture=${encodeURIComponent(slug)}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                if (!isMatchValid(json)) throw new Error("concluded or invalid");

                const meta = deriveMatchMeta(slug, json);
                if (meta) {
                    addToCache(slug, json);
                    newlyValid.push(meta);
                }
            } catch {
                // dropped silently
            }

            if (i < slice.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, STAGGER_MS));
            }
        }

        setMatches((prev) => sortByKickoff([...prev, ...newlyValid]));
        setLoadedCount((prev) => prev + slice.length);
        setBatchLoading(false);
    }, [loadedCount, batchLoading, hasMore, addToCache]);

    // Load first batch on mount only — ref guard prevents Strict Mode double-invoke
    const hasLoadedFirstBatch = useRef(false);

    useEffect(() => {
        if (hasLoadedFirstBatch.current) return;
        hasLoadedFirstBatch.current = true;
        loadNextBatch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Per-match loading (for re-fetch on click, e.g. cache was cleared) ──
    const [loadingId, setLoadingId] = useState(null);
    const [loadError, setLoadError] = useState(null);

    const handleSelectMatch = useCallback(async (matchId) => {
        setSelectedId(matchId);
        setSidebarOpen(false);
        setLoadError(null);

        if (pathname !== "/") {
            router.push("/");
        }

        if (isCached(matchId)) return;

        setLoadingId(matchId);
        try {
            const res = await fetch(`/api/odds?fixture=${encodeURIComponent(matchId)}`);
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error ?? `HTTP ${res.status}`);
            }
            const json = await res.json();
            addToCache(matchId, json);
        } catch (err) {
            setLoadError(err.message);
        } finally {
            setLoadingId(null);
        }
    }, [isCached, addToCache, setSelectedId, pathname, router]);

    // Auto-select the first match once it becomes available
    const hasAutoSelected = useRef(false);

    useEffect(() => {
        if (!hasAutoSelected.current && matches.length > 0 && selectedId === null) {
            hasAutoSelected.current = true;
            handleSelectMatch(matches[0].id);
        }
    }, [matches, selectedId, handleSelectMatch]);

    function toggleTargetMatch(matchId) {
        setTargetMatchIds((prev) =>
            prev.includes(matchId) ? prev.filter((id) => id !== matchId) : [...prev, matchId]
        );
    }

    return (
        <div className="flex h-screen overflow-hidden font-sans relative">
            {/* ── Mobile backdrop ────────────────────────────────────────── */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
            {/* ── Shared Sidebar ─────────────────────────────────────────── */}
            <aside className={`fixed inset-y-0 left-0 z-40 w-[288px] shrink-0 border-r border-slate-700 flex flex-col bg-slate-900 overflow-hidden transition-transform duration-300 md:relative md:translate-x-0 md:z-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
                {/* Brand + nav */}
                <div className="px-4 py-3 border-b border-slate-700 shrink-0">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-cyan-400 text-lg">◈</span>
                        <span className="text-sm font-bold tracking-tight text-white">OddsLab</span>
                    </div>
                    <div className="flex gap-1">
                        <NavLink href="/" active={pathname === "/"}>Dashboard</NavLink>
                        <NavLink href="/strategy" active={pathname === "/strategy"} badge={totalBets || null}>
                            Strategy
                        </NavLink>
                    </div>
                </div>

                {/* Single scrollable zone */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                    {/* Strategy Engine — collapsible */}
                    <div>
                        <button
                            onClick={() => setStrategyOpen((prev) => !prev)}
                            className="w-full flex flex-row justify-between items-center px-4 py-3 text-xs font-mono uppercase tracking-widest text-slate-500 border-b border-slate-700"
                        >
                            <span>⚡ Strategy Engine</span>
                            <span className={`transition-transform duration-200 ${strategyOpen ? "rotate-90" : ""}`}>›</span>
                        </button>
                        {strategyOpen && (
                            <div>
                                <StrategyEngine
                                    matches={matches}
                                    getCache={getCache}
                                    onGenerate={generate}
                                    manualBets={manualBets}
                                    onRemoveManual={removeManual}
                                    targetMatchIds={targetMatchIds}
                                    onTargetMatchIdsChange={setTargetMatchIds}
                                />
                            </div>
                        )}
                    </div>

                    {/* Match list */}
                    <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Matches</span>
                        <span className="text-xs font-mono text-slate-600">
                            {matches.length} live · {loadedCount}/{MATCH_SLUGS.length} checked
                        </span>
                    </div>

                    <nav className="px-2 pb-4 space-y-1">
                        {matches.map((match) => (
                            <MatchItem
                                key={match.id}
                                match={match}
                                isSelected={match.id === selectedId}
                                isLoading={loadingId === match.id}
                                isCached={isCached(match.id)}
                                isTargeted={targetMatchIds.includes(match.id)}
                                onClick={() => handleSelectMatch(match.id)}
                                onTarget={() => toggleTargetMatch(match.id)}
                            />
                        ))}

                        {hasMore && (
                            <button
                                onClick={loadNextBatch}
                                disabled={batchLoading}
                                className="w-full mt-2 py-2 rounded text-xs font-mono text-slate-400 border border-slate-700 hover:border-cyan-500/40 hover:text-cyan-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {batchLoading
                                    ? `Checking next ${Math.min(BATCH_SIZE, MATCH_SLUGS.length - loadedCount)}…`
                                    : `Load ${Math.min(BATCH_SIZE, MATCH_SLUGS.length - loadedCount)} more matches`}
                            </button>
                        )}

                        {!hasMore && matches.length === 0 && (
                            <p className="px-2 py-3 text-xs font-mono text-slate-600">No active matches.</p>
                        )}
                    </nav>

                    {loadError && (
                        <p className="px-4 text-xs text-red-400 font-mono">{loadError}</p>
                    )}
                </div>

                <div className="px-4 py-2 border-t border-slate-700 shrink-0">
                    <p className="text-xs text-slate-700 font-mono">Data via Stake.com</p>
                </div>
            </aside>

            {/* ── Page content ───────────────────────────────────────────── */}
            <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
                {/* Mobile top bar */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 bg-slate-900 md:hidden shrink-0">
                    <button
                        onClick={() => setSidebarOpen((prev) => !prev)}
                        className="text-slate-400 hover:text-white transition-colors p-1"
                        aria-label="Toggle menu"
                    >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                            <rect y="3"  width="20" height="2" rx="1"/>
                            <rect y="9"  width="20" height="2" rx="1"/>
                            <rect y="15" width="20" height="2" rx="1"/>
                        </svg>
                    </button>
                    <span className="text-sm font-bold tracking-tight text-white">OddsLab</span>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
            </main>
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────

function NavLink({ href, active, badge, children }) {
    return (
        <Link
            href={href}
            className={`relative flex-1 text-center py-1 rounded text-xs font-mono font-semibold transition-colors ${
                active
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "text-slate-500 hover:text-slate-300 border border-transparent"
            }`}
        >
            {children}
            {badge != null && (
                <span className="absolute -top-1.5 -right-1 bg-cyan-500 text-slate-900 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    {badge > 9 ? "9+" : badge}
                </span>
            )}
        </Link>
    );
}

function MatchItem({ match, isSelected, isLoading, isCached, isTargeted, onClick, onTarget }) {
    const kickoffLabel = match.kickoff
        ? new Date(match.kickoff).toLocaleString("en-US", {
              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
          })
        : null;

    return (
        <div className={`flex items-stretch transition-colors ${isSelected ? "bg-cyan-500/5" : "hover:bg-slate-800/50"}`}>
            <div className={`w-[3px] shrink-0 transition-colors ${isSelected ? "bg-cyan-400" : "bg-transparent"}`} />
            <div className="pl-4 pr-3 py-2.5 flex-1 min-w-0 flex items-start gap-1">
                <button
                    onClick={onClick}
                    className="flex-1 text-left min-w-0"
                >
                    <div className="text-sm font-medium text-slate-200 leading-snug truncate">
                        {match.home}
                        <span className="text-slate-500 mx-1 font-normal">vs</span>
                        {match.away}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs font-mono text-slate-500 truncate">{match.tournament}</span>
                        {kickoffLabel && (
                            <>
                                <span className="text-slate-700">·</span>
                                <span className="text-xs font-mono text-slate-500 shrink-0">{kickoffLabel}</span>
                            </>
                        )}
                        <span className="ml-auto text-xs font-mono shrink-0">
                            {isLoading ? (
                                <span className="text-yellow-500 animate-pulse">loading…</span>
                            ) : isCached ? (
                                <span className="text-slate-600">✓</span>
                            ) : null}
                        </span>
                    </div>
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onTarget(); }}
                    className={`shrink-0 text-xs px-1.5 py-0.5 rounded transition-colors font-mono ${
                        isTargeted
                            ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                            : "text-slate-600 hover:text-cyan-400"
                    }`}
                    title="Toggle as strategy target"
                >
                    🎯
                </button>
            </div>
        </div>
    );
}