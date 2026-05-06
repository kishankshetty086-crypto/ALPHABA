import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { refresh_token } = await request.json();
  
  const CLIENT_ID = process.env.ZOHO_CLIENT_ID;
  const CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
  const ZOHO_TOKEN_URL = process.env.ZOHO_TOKEN_URL || "https://accounts.zoho.in/oauth/v2/token";

  if (!refresh_token) {
    return NextResponse.json({ error: "No refresh token provided" }, { status: 400 });
  }

  try {
    const response = await fetch(ZOHO_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: CLIENT_ID || "",
        client_secret: CLIENT_SECRET || "",
        refresh_token: refresh_token,
      }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Token refresh failed" }, { status: 500 });
  }
}
