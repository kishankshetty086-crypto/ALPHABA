import { NextResponse } from 'next/server';
import { zohoRateLimiter, getCachedData, setCachedData } from '@/lib/rateLimiter';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

let cachedAccessToken: string | null = null;
let tokenExpiryTime: number = 0;

async function getAccessToken() {
  // If token is cached and not expired, use it
  if (cachedAccessToken && Date.now() < tokenExpiryTime) {
    return cachedAccessToken;
  }

  const CLIENT_ID = process.env.ZOHO_CLIENT_ID;
  const CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
  const REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN;
  const TOKEN_URL = process.env.ZOHO_TOKEN_URL || "https://accounts.zoho.in/oauth/v2/token";

  if (REFRESH_TOKEN === '1000.dummy_refresh_token_for_app_level_access' && process.env.ZOHO_STATIC_ACCESS_TOKEN) {
    return process.env.ZOHO_STATIC_ACCESS_TOKEN;
  }

  if (!REFRESH_TOKEN) {
    throw new Error("Missing ZOHO_REFRESH_TOKEN in environment variables");
  }

  // Rate limit token refresh as well
  await zohoRateLimiter.wait();

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: CLIENT_ID || "",
      client_secret: CLIENT_SECRET || "",
      refresh_token: REFRESH_TOKEN,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${data.error || response.statusText}`);
  }

  cachedAccessToken = data.access_token;
  // Subtracting 60 seconds from expiry time for a safe buffer
  tokenExpiryTime = Date.now() + ((data.expires_in || 3600) - 60) * 1000;
  
  return cachedAccessToken;
}

export async function GET() {
  try {
    // 1. Check Cache first
    const cacheKey = 'availability_data';
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log("Serving availability data from cache");
      return NextResponse.json(cached);
    }

    // 2. Wait for Rate Limiter
    await zohoRateLimiter.wait();

    const token = await getAccessToken();
    const SHEET_ID = process.env.ZOHO_SHEET_ID;
    const API_URL = process.env.ZOHO_SHEET_API_URL || "https://sheet.zoho.in/api/v2";

    const formData = new URLSearchParams();
    formData.append("method", "worksheet.content.get");
    formData.append("worksheet_name", "AVailability");

    const response = await fetch(`${API_URL}/${SHEET_ID}`, {
      method: "POST",
      headers: {
        "Authorization": `Zoho-oauthtoken ${token}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: formData.toString()
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error("Zoho API error:", result);
      return NextResponse.json({ error: "Failed to fetch data from Zoho Sheet API" }, { status: 500 });
    }

    // 3. Cache the result for 10 seconds
    setCachedData(cacheKey, result, 10);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Availability API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
