import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ODP_API_HOST, ODP_API_KEY } from "@/lib/optimizely/odp";

async function forwardToOdp(body: Record<string, unknown>): Promise<void> {
  if (!ODP_API_KEY) return;

  const identifiers: Record<string, string> = {};
  if (typeof body.email === "string") identifiers.email = body.email;
  // fs_user_id, not vuid: OdpSetup stitches the FX visitor id into ODP under
  // fs_user_id, so that is the identifier the visitor's profile lives under.
  if (typeof body.fs_user_id === "string") identifiers.fs_user_id = body.fs_user_id;

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

interface SubmitEnvelope {
  targetUrl?: unknown;
  payload?: Record<string, unknown>;
  formKey?: unknown;
}

// The SDK's createJsonSubmitHandler posts { targetUrl, payload, formKey } rather
// than the field values on their own. The hand-built ContactFormBlock still posts
// a flat object, so accept both and unwrap to the same shape.
function unwrap(raw: unknown): { body: Record<string, unknown>; envelope: SubmitEnvelope | null } {
  if (raw && typeof raw === "object" && "payload" in raw) {
    const envelope = raw as SubmitEnvelope;
    if (envelope.payload && typeof envelope.payload === "object") {
      return { body: envelope.payload, envelope };
    }
  }
  return { body: (raw ?? {}) as Record<string, unknown>, envelope: null };
}

export async function POST(request: NextRequest) {
  try {
    const { body, envelope } = unwrap(await request.json());

    console.log("[Form Submission]", JSON.stringify(body, null, 2));
    if (envelope) {
      console.log("[Form Submission] via SDK handler", {
        targetUrl: envelope.targetUrl,
        formKey: envelope.formKey,
      });
    }

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
