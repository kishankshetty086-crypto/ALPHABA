import { NextResponse } from 'next/server';
import { zohoRateLimiter } from '@/lib/rateLimiter';

export async function POST(request: Request) {
  try {
    const { params, token } = await request.json();
    
    // Wait for Rate Limiter
    await zohoRateLimiter.wait();

    const SHEET_ID = process.env.ZOHO_SHEET_ID;
    const ZOHO_SHEET_API_URL = process.env.ZOHO_SHEET_API_URL || "https://sheet.zoho.in/api/v2";

    // Zoho Sheet API v2 (Legacy Style) expects form-encoded data with a 'method' parameter
    const formData = new URLSearchParams();
    for (const key in params) {
      formData.append(key, typeof params[key] === 'object' ? JSON.stringify(params[key]) : params[key]);
    }

    const response = await fetch(`${ZOHO_SHEET_API_URL}/${SHEET_ID}`, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    const result = await response.json();
    
    // Diagnostic logging
    if (!response.ok) {
      console.error("Zoho Proxy Error:", result);
    } else {
      console.log("Zoho Proxy Success:", params.method);
    }

    return NextResponse.json(result, { status: response.status });
  } catch (error: any) {
    console.error("Zoho Proxy Fatal Error:", error);
    return NextResponse.json({ 
      error: "Proxy communication failure", 
      message: error.message 
    }, { status: 500 });
  }
}
