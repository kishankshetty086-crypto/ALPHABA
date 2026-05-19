import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  
  const CLIENT_ID = process.env.ZOHO_CLIENT_ID;
  const CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
  const REDIRECT_URI = process.env.ZOHO_REDIRECT_URI;
  const ZOHO_TOKEN_URL = process.env.ZOHO_TOKEN_URL || "https://accounts.zoho.in/oauth/v2/token";

  if (!code) {
    const error = searchParams.get('error');
    return NextResponse.json({ error: error || "No authorization code found" }, { status: 400 });
  }

  try {
    const response = await fetch(ZOHO_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: CLIENT_ID || "1000.1BUZ6Q71DUZOJNAFBBW200SPRA489G",
        client_secret: CLIENT_SECRET || "55930a03238302226b2e88cfa91d12a25376f4b500",
        redirect_uri: REDIRECT_URI || "https://github.com/kishankshetty086-crypto/AVAILABLEBASUPPORT/tree/main/src/app/api/auth/zoho/callback",
        code: code,
      }),
    });

    const data = await response.json();

    if (data.error) {
      return NextResponse.json(data, { status: 400 });
    }

    // Redirect back to the dashboard home
    const responseUrl = new URL('/', request.url);
    const redirectResponse = NextResponse.redirect(responseUrl);
    
    // Pass tokens to the client side via temporary cookies
    redirectResponse.cookies.set('zoho_temp_token', data.access_token, { 
      maxAge: 3600,
      path: '/'
    });
    
    if (data.refresh_token) {
      redirectResponse.cookies.set('zoho_temp_refresh', data.refresh_token, { 
        maxAge: 3600 * 24 * 30, // typically longer for refresh token
        path: '/'
      });
    }
    
    return redirectResponse;
  } catch (error) {
    return NextResponse.json({ error: "Token exchange failed" }, { status: 500 });
  }
}
