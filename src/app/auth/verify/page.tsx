"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, XCircle, Mic } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";

type VerifyState = "verifying" | "success" | "error";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { setAuth } = useAuthStore();

  const [state, setState] = useState<VerifyState>("verifying");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setError("No verification token provided");
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await fetch("/api/auth/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          setState("error");
          setError(data.error || "Verification failed");
          return;
        }

        // Save to auth store (which saves to localStorage)
        setAuth(data.user, data.token);
        setState("success");

        // Redirect to home after short delay
        setTimeout(() => {
          router.push("/");
        }, 2000);
      } catch {
        setState("error");
        setError("An error occurred during verification");
      }
    };

    verifyToken();
  }, [token, router, setAuth]);

  return (
    <>
      <Card className="border-0 shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {state === "verifying" && "Verifying your email..."}
            {state === "success" && "Email verified!"}
            {state === "error" && "Verification failed"}
          </CardTitle>
          <CardDescription>
            {state === "verifying" && "Please wait while we verify your login link"}
            {state === "success" && "You will be redirected shortly"}
            {state === "error" && error}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {state === "verifying" && (
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          )}

          {state === "success" && (
            <CheckCircle className="h-12 w-12 text-green-500" />
          )}

          {state === "error" && (
            <>
              <XCircle className="h-12 w-12 text-destructive" />
              <Button onClick={() => router.push("/login")} className="mt-4">
                Back to Login
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function VerifyLoading() {
  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Loading...</CardTitle>
        <CardDescription>Please wait</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </CardContent>
    </Card>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
            <Mic className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Vexa</h1>
            <p className="text-sm text-muted-foreground">Meeting Transcription</p>
          </div>
        </div>

        <Suspense fallback={<VerifyLoading />}>
          <VerifyContent />
        </Suspense>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Vexa Dashboard - Open Source Meeting Transcription
        </p>
      </div>
    </div>
  );
}
