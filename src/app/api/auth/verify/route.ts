import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { getRegistrationConfig, validateEmailForRegistration } from "@/lib/registration";

const JWT_SECRET = process.env.JWT_SECRET || process.env.VEXA_ADMIN_API_KEY || "default-secret-change-me";

interface MagicLinkPayload {
  email: string;
  type: string;
}

/**
 * Verify magic link token and complete login
 */
export async function POST(request: NextRequest) {
  const VEXA_ADMIN_API_URL = process.env.VEXA_ADMIN_API_URL || process.env.VEXA_API_URL || "http://localhost:18056";
  const VEXA_ADMIN_API_KEY = process.env.VEXA_ADMIN_API_KEY || "";

  if (!VEXA_ADMIN_API_KEY) {
    return NextResponse.json(
      { error: "Server not configured for authentication" },
      { status: 500 }
    );
  }

  try {
    const { token } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Verify JWT token
    let payload: MagicLinkPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as MagicLinkPayload;
    } catch (jwtError) {
      if ((jwtError as jwt.JsonWebTokenError).name === "TokenExpiredError") {
        return NextResponse.json(
          { error: "Link has expired. Please request a new one." },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: "Invalid or expired link" },
        { status: 401 }
      );
    }

    if (payload.type !== "magic-link") {
      return NextResponse.json(
        { error: "Invalid token type" },
        { status: 401 }
      );
    }

    const email = payload.email;

    // Step 1: Try to find user by email
    let user = null;
    let userExists = false;
    const userResponse = await fetch(
      `${VEXA_ADMIN_API_URL}/admin/users/email/${encodeURIComponent(email)}`,
      {
        headers: {
          "X-Admin-API-Key": VEXA_ADMIN_API_KEY,
        },
      }
    );

    if (userResponse.ok) {
      user = await userResponse.json();
      userExists = true;
    } else if (userResponse.status !== 404) {
      const error = await userResponse.text();
      return NextResponse.json(
        { error: "Failed to find user", details: error },
        { status: 500 }
      );
    }

    // Step 2: Check registration restrictions before creating new user
    if (!userExists) {
      const config = getRegistrationConfig();
      const validationError = validateEmailForRegistration(email, false, config);

      if (validationError) {
        return NextResponse.json(
          { error: validationError },
          { status: 403 }
        );
      }

      // Create new user
      const createResponse = await fetch(`${VEXA_ADMIN_API_URL}/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-API-Key": VEXA_ADMIN_API_KEY,
        },
        body: JSON.stringify({
          email,
          name: email.split("@")[0],
          max_concurrent_bots: 3,
        }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.text();
        return NextResponse.json(
          { error: "Failed to create user", details: error },
          { status: 500 }
        );
      }

      user = await createResponse.json();
    }

    // Step 3: Create new API token for this session
    const tokenResponse = await fetch(
      `${VEXA_ADMIN_API_URL}/admin/users/${user.id}/tokens`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-API-Key": VEXA_ADMIN_API_KEY,
        },
      }
    );

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      return NextResponse.json(
        { error: "Failed to create API token", details: error },
        { status: 500 }
      );
    }

    const newToken = await tokenResponse.json();
    const apiToken = newToken.token;

    // Step 4: Set token in HTTP-only cookie for security
    const cookieStore = await cookies();
    cookieStore.set("vexa-token", apiToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    // Step 5: Return user info and token for localStorage
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        max_concurrent_bots: user.max_concurrent_bots,
        created_at: user.created_at,
      },
      token: apiToken, // Return token for localStorage storage
    });
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json(
      { error: "Verification failed", details: (error as Error).message },
      { status: 500 }
    );
  }
}
