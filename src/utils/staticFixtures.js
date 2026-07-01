// src/utils/staticFixtures.js
// Maps fixture slugs to their statically-committed JSON snapshots.
// When a concluded match is clicked, the app loads from here instead of
// hitting the relay — so the data is available even after the World Cup ends.
//
// To add a new static fixture:
// 1. Save the full /api/odds response JSON to static/fixtures/<slug>.json
// 2. Add an entry here: "<slug>": () => import(`../../static/fixtures/<slug>.json`)
//
// Using dynamic imports so only the requested fixture's JSON is loaded,
// not all of them at once on app startup.

const STATIC_FIXTURES = {
    "46232386-brazil-haiti":
        () => import("../../static/fixtures/46232386-brazil-haiti.json"),
    "46232387-scotland-brazil":
        () => import("../../static/fixtures/46232387-scotland-brazil.json"),
    "46462238-czechia-south-africa":
        () => import("../../static/fixtures/46462238-czechia-south-africa.json"),
    "46473745-colombia-congo-dr":
        () => import("../../static/fixtures/46473745-colombia-congo-dr.json"),
    "46511460-mexico-korea-republic":
        () => import("../../static/fixtures/46511460-mexico-korea-republic.json"),
    "46511465-canada-qatar":
        () => import("../../static/fixtures/46511465-canada-qatar.json"),
    "46511466-switzerland-bosnia-and-herzegovina":
        () => import("../../static/fixtures/46511466-switzerland-bosnia-and-herzegovina.json"),
    "46511468-scotland-morocco":
        () => import("../../static/fixtures/46511468-scotland-morocco.json"),
    "46511469-usa-australia":
        () => import("../../static/fixtures/46511469-usa-australia.json"),
    "46511484-germany-ivory-coast":
        () => import("../../static/fixtures/46511484-germany-ivory-coast.json"),
    "46511485-ecuador-curacao":
        () => import("../../static/fixtures/46511485-ecuador-curacao.json"),
    "46511494-tunisia-japan":
        () => import("../../static/fixtures/46511494-tunisia-japan.json"),
    "46511511-spain-saudi-arabia":
        () => import("../../static/fixtures/46511511-spain-saudi-arabia.json"),
    "46511512-turkiye-paraguay":
        () => import("../../static/fixtures/46511512-turkiye-paraguay.json"),
    "46511513-netherlands-sweden":
        () => import("../../static/fixtures/46511513-netherlands-sweden.json"),
    "46511516-france-iraq":
        () => import("../../static/fixtures/46511516-france-iraq.json"),
    "46511517-argentina-austria":
        () => import("../../static/fixtures/46511517-argentina-austria.json"),
    "46511518-new-zealand-egypt":
        () => import("../../static/fixtures/46511518-new-zealand-egypt.json"),
    "46511519-uruguay-cape-verde":
        () => import("../../static/fixtures/46511519-uruguay-cape-verde.json"),
    "46511521-jordan-algeria":
        () => import("../../static/fixtures/46511521-jordan-algeria.json"),
    "46511522-norway-senegal":
        () => import("../../static/fixtures/46511522-norway-senegal.json"),
    "46511530-portugal-uzbekistan":
        () => import("../../static/fixtures/46511530-portugal-uzbekistan.json"),
    "46511531-panama-croatia":
        () => import("../../static/fixtures/46511531-panama-croatia.json"),
    "46511532-england-ghana":
        () => import("../../static/fixtures/46511532-england-ghana.json"),
    "46517406-colombia-portugal":
        () => import("../../static/fixtures/46517406-colombia-portugal.json"),
    "46547631-belgium-ir-iran":
        () => import("../../static/fixtures/46547631-belgium-ir-iran.json"),
    "46571784-czechia-mexico":
        () => import("../../static/fixtures/46571784-czechia-mexico.json"),
    "46571786-bosnia-and-herzegovina-qatar":
        () => import("../../static/fixtures/46571786-bosnia-and-herzegovina-qatar.json"),
    "46571787-switzerland-canada":
        () => import("../../static/fixtures/46571787-switzerland-canada.json"),
    "46571840-curacao-ivory-coast":
        () => import("../../static/fixtures/46571840-curacao-ivory-coast.json"),
    "46571841-new-zealand-belgium":
        () => import("../../static/fixtures/46571841-new-zealand-belgium.json"),
    "46571842-senegal-iraq":
        () => import("../../static/fixtures/46571842-senegal-iraq.json"),
    "46571843-ecuador-germany":
        () => import("../../static/fixtures/46571843-ecuador-germany.json"),
    "46571844-south-africa-korea-republic":
        () => import("../../static/fixtures/46571844-south-africa-korea-republic.json"),
    "46571845-tunisia-netherlands":
        () => import("../../static/fixtures/46571845-tunisia-netherlands.json"),
    "46571846-croatia-ghana":
        () => import("../../static/fixtures/46571846-croatia-ghana.json"),
    "46571847-turkiye-usa":
        () => import("../../static/fixtures/46571847-turkiye-usa.json"),
    "46571848-algeria-austria":
        () => import("../../static/fixtures/46571848-algeria-austria.json"),
    "46571849-panama-england":
        () => import("../../static/fixtures/46571849-panama-england.json"),
    "46571850-norway-france":
        () => import("../../static/fixtures/46571850-norway-france.json"),
    "46571851-congo-dr-uzbekistan":
        () => import("../../static/fixtures/46571851-congo-dr-uzbekistan.json"),
    "46571852-japan-sweden":
        () => import("../../static/fixtures/46571852-japan-sweden.json"),
    "46571853-paraguay-australia":
        () => import("../../static/fixtures/46571853-paraguay-australia.json"),
    "46571854-egypt-ir-iran":
        () => import("../../static/fixtures/46571854-egypt-ir-iran.json"),
    "46571855-morocco-haiti":
        () => import("../../static/fixtures/46571855-morocco-haiti.json"),
    "46571856-cape-verde-saudi-arabia":
        () => import("../../static/fixtures/46571856-cape-verde-saudi-arabia.json"),
    "46571857-uruguay-spain":
        () => import("../../static/fixtures/46571857-uruguay-spain.json"),
    "46571858-jordan-argentina":
        () => import("../../static/fixtures/46571858-jordan-argentina.json"),
};

/**
 * Returns true if a static snapshot exists for this slug.
 */
export function hasStaticFixture(slug) {
    return slug in STATIC_FIXTURES;
}

/**
 * Loads and returns the static fixture JSON for a given slug.
 * Returns null if no static snapshot exists.
 */
export async function loadStaticFixture(slug) {
    if (!hasStaticFixture(slug)) return null;
    try {
        const mod = await STATIC_FIXTURES[slug]();
        return mod.default ?? mod;
    } catch (err) {
        console.error(`[staticFixtures] Failed to load static fixture for ${slug}:`, err);
        return null;
    }
}
