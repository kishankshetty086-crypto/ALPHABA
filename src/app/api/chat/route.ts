import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientName, contactDetails, message } = body;

    if (!clientName || !contactDetails || !message) {
      return NextResponse.json({ error: "All fields are mandatory" }, { status: 400 });
    }

    // Format the message for Zoho Cliq
    const cliqMessage = `*New Chat Alert from Availability Page*\n\n**Client Name:** ${clientName}\n**Contact Details:** ${contactDetails}\n**Message:**\n${message}`;

    const payload = {
      text: cliqMessage
    };

    // Replace this directly since the user provided it, but in production, move it to .env
    const ZOHO_CLIQ_URL = "https://cliq.zoho.in/api/v2/channelsbyname/teamalpha/message?zapikey=1001.963caf6e20ed62d46ccfd84f93f8fe9a.d49ed3d98a091369356d486f430f5580";

    const response = await fetch(ZOHO_CLIQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Zoho Cliq API Error:", errorData);
      return NextResponse.json({ error: "Failed to send message to Zoho Cliq" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Alert sent successfully" });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
