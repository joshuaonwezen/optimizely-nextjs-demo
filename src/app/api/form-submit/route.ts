import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Form submission handler.
 *
 * In production, this would forward submissions to a CRM, email service,
 * or Optimizely Data Platform. For this demo, it logs and returns success.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Log submission (replace with actual integration in production)
    console.log("[Form Submission]", JSON.stringify(body, null, 2));

    return NextResponse.json(
      { success: true, message: "Form submitted successfully" },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request" },
      { status: 400 }
    );
  }
}
