// scripts/snapshot-fixtures.js
// Fetches every slug from the relay and saves valid responses as static JSON.
// Output goes to static/fixtures/<slug>.json — gitignored, used as demo placeholders.
// Run with: node scripts/snapshot-fixtures.js

const { readFileSync, mkdirSync, writeFileSync } = require("fs");
const { join } = require("path");

const root = join(__dirname, "..");
const RELAY_URL = "https://oddslab-relay.onrender.com/api/odds";
const OUT_DIR = join(root, "static", "fixtures");
const SLUGS = JSON.parse(readFileSync(join(root, "src", "config", "matchSlugs.json"), "utf8"));
const STAGGER_MS = 300;

async function run() {
    mkdirSync(OUT_DIR, { recursive: true });

    let saved = 0;
    let skipped = 0;

    for (let i = 0; i < SLUGS.length; i++) {
        const slug = SLUGS[i];
        process.stdout.write(`[${i + 1}/${SLUGS.length}] ${slug} … `);

        try {
            const res = await fetch(`${RELAY_URL}?fixture=${encodeURIComponent(slug)}`);
            if (!res.ok) {
                console.log(`HTTP ${res.status} — skipped`);
                skipped++;
            } else {
                const json = await res.json();
                const fixture = json?.data?.slugFixture;
                if (!fixture) {
                    console.log("no fixture — skipped");
                    skipped++;
                } else {
                    writeFileSync(join(OUT_DIR, `${slug}.json`), JSON.stringify(json, null, 2));
                    const status = fixture.status ?? fixture.eventStatus?.matchStatus ?? "unknown";
                    console.log(`saved (${status})`);
                    saved++;
                }
            }
        } catch (err) {
            console.log(`error: ${err.message} — skipped`);
            skipped++;
        }

        if (i < SLUGS.length - 1) {
            await new Promise((r) => setTimeout(r, STAGGER_MS));
        }
    }

    console.log(`\nDone. ${saved} saved, ${skipped} skipped → static/fixtures/`);
}

run().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
});
