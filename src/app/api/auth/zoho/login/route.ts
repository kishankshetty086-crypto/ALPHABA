import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const ZOHO_AUTH_URL = process.env.ZOHO_AUTH_URL || "https://accounts.zoho.in/oauth/v2/auth";
  const CLIENT_ID = process.env.ZOHO_CLIENT_ID;
  const REDIRECT_URI = process.env.ZOHO_REDIRECT_URI;
  const SCOPES = "ZohoSheet.dataAPI.ALL";

  const params = new URLSearchParams({
    scope: SCOPES,
    client_id: CLIENT_ID || "",
    response_type: 'code',
    access_type: 'offline',
    redirect_uri: REDIRECT_URI || "",
    prompt: 'consent',
  });

  return NextResponse.redirect(`${ZOHO_AUTH_URL}?${params.toString()}`);
}
