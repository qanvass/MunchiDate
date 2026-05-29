/**
 * SpecialsApp Database Schema Definition & Spatial API Helpers (Munchi Bot)
 * Location in project: db/schema.js
 */

import { getDistanceMiles } from '../src/data/specialsData.js'; // standard haversine if available, or we define it locally

// Haversine Distance Formula in JS (in case imports aren't accessible)
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 3958.8; // Radius of the Earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * JS Schema Definition for reference and runtime validations
 */
export const SpecialsSchema = {
  tableName: 'specials',
  columns: {
    id: { type: 'integer', primaryKey: true, autoIncrement: true },
    restaurant_name: { type: 'string', nullable: false },
    specials_description: { type: 'string', nullable: false },
    day_of_week: { type: 'string', nullable: false }, // e.g. 'Monday'
    start_time: { type: 'string', nullable: true },   // e.g. '17:00' or '5 PM'
    end_time: { type: 'string', nullable: true },     // e.g. '22:00' or '10 PM'
    is_happy_hour: { type: 'boolean', default: false },
    auto_parsed: { type: 'boolean', default: true },   // auto_parsed status boolean field
    status: { type: 'string', default: 'auto_parsed' },// auto_parsed status string ('auto_parsed', 'pending', 'verified')
    address: { type: 'string', nullable: true },
    ig: { type: 'string', nullable: true },
    neighborhood: { type: 'string', nullable: true },
    image: { type: 'string', nullable: true },
    video: { type: 'string', nullable: true },
    lat: { type: 'double', nullable: true },
    lng: { type: 'double', nullable: true },
    geom: { type: 'spatial_point', nullable: true },   // PostGIS Point type
    created_at: { type: 'timestamp', default: 'now()' }
  }
};

/**
 * Fetch Specials within a specific radius of the user's location.
 * Implements high-fidelity spatial filtering using PostGIS and coordinate math fallbacks.
 *
 * @param {Object} supabase - Connected Supabase Client
 * @param {number} userLat - User geocoded Latitude
 * @param {number} userLng - User geocoded Longitude
 * @param {number} [radiusMiles=15] - Distance threshold (default 15 miles)
 * @param {boolean} [isMocked=false] - Whether database client is mocked
 * @param {Array} [localFallbackData=[]] - Local array for mock mode filtering
 * @returns {Promise<Array>} List of filtered specials with distances
 */
export async function querySpecialsWithinRadius({
  supabase,
  userLat,
  userLng,
  radiusMiles = 15.0,
  isMocked = false,
  localFallbackData = []
}) {
  if (!userLat || !userLng) {
    throw new Error("Spatial query requires valid user latitude and longitude geocoordinates.");
  }

  console.log(`🌐 Spatial query initiated for coordinates [${userLat}, ${userLng}] within ${radiusMiles} miles.`);

  // 1. Local Mock Mode Fallback (Zero DB dependency)
  if (isMocked || !supabase) {
    console.warn("⚠️ Database client is mocked. Running client-side coordinate math (Haversine) spatial filter.");
    return localFallbackData
      .map(special => {
        const dist = calculateHaversineDistance(userLat, userLng, special.lat, special.lng);
        return { ...special, distance_miles: dist ? parseFloat(dist.toFixed(2)) : null };
      })
      .filter(special => special.distance_miles !== null && special.distance_miles <= radiusMiles)
      .sort((a, b) => a.distance_miles - b.distance_miles);
  }

  // 2. Production Database Mode: Try PostGIS ST_DWithin RPC
  try {
    const { data, error } = await supabase.rpc('get_specials_within_radius', {
      user_lat: userLat,
      user_lng: userLng,
      radius_miles: radiusMiles
    });

    if (error) throw error;
    
    if (data && data.length > 0) {
      console.log(`✨ PostGIS spatial query returned ${data.length} specials within ${radiusMiles} miles.`);
      return data;
    }
  } catch (postgisErr) {
    console.warn("⚠️ PostGIS get_specials_within_radius RPC failed. Trying pure mathematical coordinate RPC...");
    console.debug(postgisErr);
  }

  // 3. Fallback database Mode: Try coordinate math RPC (Haversine in SQL)
  try {
    const { data, error } = await supabase.rpc('get_specials_within_radius_math', {
      user_lat: userLat,
      user_lng: userLng,
      radius_miles: radiusMiles
    });

    if (error) throw error;
    
    if (data) {
      console.log(`⚡ Coordinate-math SQL spatial query returned ${data.length} specials within ${radiusMiles} miles.`);
      return data;
    }
  } catch (sqlMathErr) {
    console.error("❌ SQL-level spatial calculations failed entirely.", sqlMathErr);
  }

  // 4. Ultimate Fallback: Retrieve all database records and do Haversine in JS
  try {
    console.warn("⚠️ Database spatial RPC functions unavailable. Fetching all specials and calculating Haversine in JS.");
    const { data, error } = await supabase
      .from('specials')
      .select('*');

    if (error) throw error;

    if (data) {
      return data
        .map(special => {
          const dist = calculateHaversineDistance(userLat, userLng, special.lat, special.lng);
          return { ...special, distance_miles: dist ? parseFloat(dist.toFixed(2)) : null };
        })
        .filter(special => special.distance_miles !== null && special.distance_miles <= radiusMiles)
        .sort((a, b) => a.distance_miles - b.distance_miles);
    }
  } catch (fallbackErr) {
    console.error("❌ Database connection error on ultimate fallback spatial calculation.", fallbackErr);
  }

  return [];
}
