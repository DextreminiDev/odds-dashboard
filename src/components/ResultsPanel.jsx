"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "./icons";

export default function ResultsPanel({ concludedMatches, onSelect }) {
    const [collapsed, setCollapsed] = useState(true);

    if (concludedMatches.length === 0) return null;

    return (
        <div className="border-t border-slate-700">
            <button
                onClick={() => setCollapsed((c) => !c)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-800 transition-colors"
            >
                <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                        Results
                    </span>
                    <span className="text-xs font-mono text-slate-600">({concludedMatches.length})</span>
                </div>
                {collapsed ? (
                    <ChevronRightIcon className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                    <ChevronDownIcon className="w-3.5 h-3.5 text-slate-500" />
                )}
            </button>

            {!collapsed && (
                <div className="px-2 pb-3 space-y-1 max-h-64 overflow-y-auto">
                    {concludedMatches.map((match) => (
                        <ResultItem
                            key={match.id}
                            match={match}
                            onSelect={() => onSelect(match.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function ResultItem({ match, onSelect }) {
    const kickoffLabel = match.kickoff
        ? new Date(match.kickoff).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : null;

    return (
        <button
            onClick={onSelect}
            className="w-full text-left rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 hover:bg-slate-800/60 hover:border-slate-700 transition-colors"
        >
            <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-slate-400 leading-snug truncate">
                    {match.home}
                    <span className="text-slate-600 mx-1">v</span>
                    {match.away}
                </div>
                {match.homeScore != null && match.awayScore != null && (
                    <span className="font-mono text-xs font-bold text-slate-300 shrink-0">
                        {match.homeScore}–{match.awayScore}
                    </span>
                )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs font-mono text-slate-600">{match.tournament}</span>
                {kickoffLabel && (
                    <>
                        <span className="text-slate-700">·</span>
                        <span className="text-xs font-mono text-slate-600">{kickoffLabel}</span>
                    </>
                )}
            </div>
        </button>
    );
}
