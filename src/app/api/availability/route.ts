import { NextResponse } from 'next/server';

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

  if (!REFRESH_TOKEN) {
    throw new Error("Missing ZOHO_REFRESH_TOKEN in environment variables");
  }

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
    const token = await getAccessToken();
    const SHEET_ID = process.env.ZOHO_SHEET_ID;
    const API_URL = process.env.ZOHO_SHEET_API_URL || "https://sheet.zoho.in/api/v2";

    const formData = new URLSearchParams();
    formData.append("method", "worksheet.records.fetch");
    formData.append("worksheet_name", "Sheet1"); // Change this to your actual worksheet name if different

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

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Availability API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
