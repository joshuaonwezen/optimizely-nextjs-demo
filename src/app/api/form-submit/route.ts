import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ODP_API_HOST = process.env.OPTIMIZELY_ODP_API_HOST ?? "https://api.zaius.com";
const ODP_API_KEY = process.env.OPTIMIZELY_ODP_API_KEY ?? "";

async function forwardToOdp(body: Record<string, unknown>): Promise<void> {
  if (!ODP_API_KEY) return;

  const identifiers: Record<string, string> = {};
  if (typeof body.email === "string") identifiers.email = body.email;
  if (typeof body.fs_user_id === "string") identifiers.vuid = body.fs_user_id;

  const formFields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (k !== "fs_user_id") formFields[k] = v;
  }

  const res = await fetch(`${ODP_API_HOST}/v3/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ODP_API_KEY,
    },
    body: JSON.stringify({
      type: "event",
      action: "form_submit",
      identifiers,
      data: formFields,
    }),
  });

  if (!res.ok) {
    throw new Error(`ODP responded ${res.status}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("[Form Submission]", JSON.stringify(body, null, 2));

    await forwardToOdp(body).catch((err: unknown) => {
      console.warn("[Form Submission] ODP forward failed:", err);
    });

    return NextResponse.json(
      { success: true, message: "Form submitted successfully", received: body },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request" },
      { status: 400 }
    );
  }
}
