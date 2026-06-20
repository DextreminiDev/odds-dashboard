import requests
import json

# Your existing headers (keep them exactly as you had them)
headers = {
    'accept': '*/*',
    'content-type': 'application/json',
    'origin': 'https://stake.com',
    'x-operation-name': 'SlugTournament',
    # ... include your user-agent and other basic headers here
}

# You will need to drop your cf_clearance cookie string in here
cookies = {
    'cf_clearance': 'YOUR_CLOUDFLARE_COOKIE_HERE', 
}

# The massive GraphQL payload you just found
json_data = {
    'query': 'query SlugTournament($sport: String!, $category: String!, $tournament: String!, $type: SportSearchEnum!, $limit: Int = 10, $offset: Int = 0) {\n  slugTournament(sport: $sport, category: $category, tournament: $tournament) {\n    id\n    name\n    slug\n    fixtureCount(type: $type)\n    fixtureList(type: $type, limit: $limit, offset: $offset) {\n      ...FixturePreview\n    }\n  }\n}\n\nfragment FixturePreview on SportFixture {\n  slug\n  name\n  status\n  data {\n    __typename\n    ...SportFixtureDataMatch\n  }\n}\n\nfragment SportFixtureDataMatch on SportFixtureDataMatch {\n  startTime\n}',
    'variables': {
        'type': 'upcoming',  # <--- Note: I changed this to 'upcoming' since the WC hasn't started yet!
        'tournament': 'world-cup',
        'category': 'international',
        'sport': 'soccer',
        'limit': 50,
        'offset': 0
    },
}

response = requests.post('https://stake.com/_api/graphql', headers=headers, cookies=cookies, json=json_data)

if response.status_code == 200:
    data = response.json()
    fixtures = data['data']['slugTournament']['fixtureList']
    
    match_slugs = []
    
    print(f"Found {len(fixtures)} matches!")
    
    for match in fixtures:
        print(f"Match: {match['name']} | Slug: {match['slug']}")
        match_slugs.append(match['slug'])
        
    # Save the list of slugs to use in your other script!
    with open('world_cup_slugs.json', 'w') as f:
        json.dump(match_slugs, f, indent=4)
else:
    print("Failed to fetch tournament data")
    print(response.text)