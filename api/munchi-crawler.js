/**
 * Munchi Bot Daily Cron Crawler Endpoint
 * Location in project: api/munchi-crawler.js
 */

import { extractSpecialsFromRaw, seedParsedSpecials } from './gemini-parser.js';

// Security secret to prevent unauthorized scraping triggers
const CRON_SECRET = process.env.MUNCHI_CRON_SECRET || 'munchi_secret_token_12345';

// Pre-seeded high-value target feeds (Atlanta restaurants)
const TARGET_FEEDS = [
  {
    name: "Hudson Grille Midtown",
    type: "website",
    url: "https://hudsongrille.com/midtown-menu-specials",
    mockRawContent: `
      <html>
        <body>
          <div class="navigation">Menu - Locations - Contact</div>
          <div class="main-content">
            <h1>Midtown Atlanta Specials</h1>
            <p>Welcome to Hudson Grille Midtown, Atlanta's best sports bar! Check out our daily specials below.</p>
            <div class="deal-card">
              <h3>Monday Madness</h3>
              <p>Get $4.50 off all gourmet burgers when paired with an MNB 404 Local Lager! Plus, enjoy 50% off all starters from 3:00 PM to 6:00 PM.</p>
            </div>
            <div class="deal-card">
              <h3>Taco Tuesday</h3>
              <p>Enjoy $2 street tacos (chicken, beef, or veggie) all day long! Pairs perfectly with our $5 house margaritas from open to close.</p>
            </div>
            <div class="deal-card">
              <h3>Wine Down Wednesday</h3>
              <p>Half-priced select bottles of wine paired with our special cheese/charcuterie boards (4 PM - 9 PM).</p>
            </div>
          </div>
          <div class="footer">© 2026 Hudson Grille. 942 Peachtree St NE, Atlanta, GA 30309.</div>
        </body>
      </html>
    `
  },
  {
    name: "Cypress Street Pint & Plate",
    type: "social_handle",
    url: "https://instagram.com/cypressstreet",
    mockRawContent: `
      [Instagram Bio & Latest Post @cypressstreet]
      Cypress Street Pint & Plate - 817 W Peachtree St NW, Atlanta, GA 30308.
      
      POST 1:
      "Monday is for the house pints! 🍺 Grab our signature $3 Cypress House Pint drafts all day long on Mondays. Patio is open, the sun is shining, and the pints are cold! #atlparents #midtownatl #beerspecials #alldaymonday"
      
      POST 2:
      "Aperitivo Thursdays! Get half-off our legendary soft pretzel bites with IPA cheese sauce, and enjoy $6 classic cocktails from 4:00 PM to 7:00 PM. Tap link in bio to reserve a patio table! 🥨🍹"
    `
  },
  {
    name: "Loca Luna Sangria Bar",
    type: "google_profile",
    url: "https://google.com/maps/place/Loca+Luna",
    mockRawContent: `
      Loca Luna - 550-C Amsterdam Ave NE, Atlanta, GA 30306.
      
      Latest Updates from Business Profile:
      "Sangria & Tapas Monday! Don't miss out on our iconic 99-cent Sangria glasses and half-priced Spanish tapas plates served tonight from 5 PM to 10 PM. Live flamenco music starts at 7 PM on our heated patio. Bring your friends and let's toast! 🍷💃"
    `
  }
];

/**
 * Background crawler endpoint that coordinates fetching, parsing, and database seeding.
 * Supports Vercel Cron triggers and manual secure hits.
 */
export default async function handler(req, res) {
  // 1. Authorize Request
  const authHeader = req.headers['authorization'];
  const querySecret = req.query?.secret;
  
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${CRON_SECRET}` &&
    querySecret !== CRON_SECRET
  ) {
    console.warn("🚫 Unauthorized crawl attempt detected.");
    return res.status(401).json({ error: "Unauthorized. Invalid cron secret token." });
  }

  console.log("🚀 Munchi Bot autonomous crawler execution started!");
  const crawlDiagnostics = [];
  let successfulExtractions = 0;
  let totalSeededDeals = 0;

  // 2. Iterate through target restaurant feeds
  for (const feed of TARGET_FEEDS) {
    console.log(`📡 Crawling target feed: "${feed.name}" (${feed.type}) - URL: ${feed.url}`);
    
    let rawData = '';
    let crawlStatus = 'success';

    try {
      // Perform a real fetch to grab the webpage content
      // Note: In local sandbox, we add a short timeout to prevent hanging on offline external sites
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(feed.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 MunchiBot/2.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        rawData = await response.text();
        console.log(`📥 Web scrap returned ${rawData.length} bytes of raw HTML.`);
      } else {
        throw new Error(`HTTP Status Error: ${response.status}`);
      }
    } catch (fetchErr) {
      console.warn(`⚠️ Scrap failed for ${feed.name}: ${fetchErr.message}. Activating high-fidelity HTML/text mock feed fallback.`);
      rawData = feed.mockRawContent;
      crawlStatus = 'fallback_mock_scraped';
    }

    // 3. Send grabbed raw text/HTML to Gemini AI Extraction Engine
    try {
      console.log(`🤖 Sending raw text of "${feed.name}" to Gemini JSON parser...`);
      const parsedResults = await extractSpecialsFromRaw(rawData);
      
      console.log(`✅ Extracted structured specials from AI for "${feed.name}". Seeding to Supabase...`);
      const seededDeals = await seedParsedSpecials(parsedResults);

      successfulExtractions++;
      totalSeededDeals += seededDeals.length;

      crawlDiagnostics.push({
        restaurantName: feed.name,
        sourceUrl: feed.url,
        feedType: feed.type,
        crawlStatus,
        parsedSpecialsCount: parsedResults.specials?.length || 0,
        seededSpecialsCount: seededDeals.length,
        seededSpecialsList: seededDeals.map(d => `${d.day_of_week}: ${d.specials_description.substring(0, 40)}...`)
      });
    } catch (parseErr) {
      console.error(`❌ Extraction pipeline failure for ${feed.name}:`, parseErr.message);
      crawlDiagnostics.push({
        restaurantName: feed.name,
        sourceUrl: feed.url,
        feedType: feed.type,
        crawlStatus: 'failed',
        error: parseErr.message
      });
    }
  }

  // 4. Return complete execution breakdown
  const summaryReport = {
    timestamp: new Date().toISOString(),
    engine: "Munchi Bot Crawler v2.0",
    totalFeedsChecked: TARGET_FEEDS.length,
    successfulExtractions,
    totalSeededDeals,
    diagnostics: crawlDiagnostics
  };

  console.log("🏁 Autonomous crawl architecture run completed!", summaryReport);
  return res.status(200).json(summaryReport);
}
