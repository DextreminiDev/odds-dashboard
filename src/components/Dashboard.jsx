"use client";

import OddsViewer from "./OddsViewer";
import { useStrategy } from "@/context/StrategyContext";

export default function Dashboard() {
    const { selectedId, getSelectedFixture, addManual } = useStrategy();

    const fixtureData = getSelectedFixture();
    const loading = selectedId != null && fixtureData == null;

    const isReadOnly = fixtureData?.data?.slugFixture?.status?.toLowerCase() === "ended";

    return (
        <div className="h-full flex flex-col">
            <OddsViewer
                data={fixtureData}
                loading={loading}
                error={null}
                onAddManual={addManual}
                readOnly={isReadOnly}
            />
        </div>
    );
}
