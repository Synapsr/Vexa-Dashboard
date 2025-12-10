import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { sendMagicLinkEmail } from "@/lib/email";
import { getRegistrationConfig, validateEmailForRegistration } from "@/lib/registration";

const JWT_SECRET = process.env.JWT_SECRET || process.env.VEXA_ADMIN_API_KEY || "default-secret-change-me";
const MAGIC_LINK_EXPIRY = "15m"; // 15 minutes

/**
 * Check if user exists in Vexa API
 */
async function checkUserExists(email: string): Promise<boolean> {
  const VEXA_ADMIN_API_URL = process.env.VEXA_ADMIN_API_URL || process.env.VEXA_API_URL || "http://localhost:18056";
  const VEXA_ADMIN_API_KEY = process.env.VEXA_ADMIN_API_KEY || "";

  if (!VEXA_ADMIN_API_KEY) {
    // Can't check without admin key, assume user doesn't exist
    return false;
  }

  try {
    const response = await fetch(
      `${VEXA_ADMIN_API_URL}/admin/users/email/${encodeURIComponent(email)}`,
      {
        headers: {
          "X-Admin-API-Key": VEXA_ADMIN_API_KEY,
        },
      }
    );

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Send magic link endpoint - sends an email with verification link
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Check registration restrictions before sending email (better UX)
    const config = getRegistrationConfig();
    const userExists = await checkUserExists(email);
    const validationError = validateEmailForRegistration(email, userExists, config);

    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 403 }
      );
    }

    // Generate JWT token with email
    const token = jwt.sign(
      { email, type: "magic-link" },
      JWT_SECRET,
      { expiresIn: MAGIC_LINK_EXPIRY }
    );

    // Build magic link URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                   (request.headers.get("origin") ||
                    `${request.headers.get("x-forwarded-proto") || "http"}://${request.headers.get("host")}`);

    const magicLink = `${baseUrl}/auth/verify?token=${encodeURIComponent(token)}`;

    // Send email
    try {
      await sendMagicLinkEmail(email, magicLink);
    } catch (emailError) {
      console.error("Failed to send magic link email:", emailError);
      return NextResponse.json(
        { error: "Failed to send email. Please check SMTP configuration.", details: (emailError as Error).message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Magic link sent to your email",
    });
  } catch (error) {
    console.error("Send magic link error:", error);
    return NextResponse.json(
      { error: "Failed to send magic link", details: (error as Error).message },
      { status: 500 }
    );
  }
}
