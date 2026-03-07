"use client";

import { useState } from "react";
import { getSession, signOut } from "@/app/lib/auth-client";

interface LoggedInViewProps {
  email: string;
  challenge: string | null;
}

export function LoggedInView({ email, challenge }: LoggedInViewProps) {
  const [signingOut, setSigningOut] = useState(false);

  const handleContinue = async () => {
    try {
      const sessionData = await getSession();
      const token = sessionData?.data?.session?.token;

      if (!token) {
        throw new Error("Failed to get token");
      }

      const deepLinkUrl = `dbdesk://session?token=${encodeURIComponent(token)}&challenge=${encodeURIComponent(challenge || "")}`;
      window.location.href = deepLinkUrl;
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleLogout = async () => {
    setSigningOut(true);
    await signOut(challenge);
  };

  return (
    <div className="flex flex-col flex-1 -translate-y-16">
      <section className="flex flex-col items-center justify-center flex-1 px-6 py-24">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-fd-foreground mb-2">
              Log in to DBDesk?
            </h1>
            <p className="text-fd-muted-foreground mb-6">
              You&apos;re currently logged in as:
            </p>
          </div>

          <div className="rounded-lg border border-fd-border bg-fd-secondary/30 px-4 py-3">
            <p className="text-center text-fd-foreground font-medium">
              {email}
            </p>
          </div>

          <p className="text-fd-muted-foreground text-sm">
            Please only log in if you just came from the DBDesk app.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-4">
            <button
              onClick={handleLogout}
              disabled={signingOut}
              className="rounded-lg border border-fd-border bg-fd-secondary/30 px-4 py-3 font-medium text-fd-foreground transition-all hover:bg-fd-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signingOut ? "Logging out..." : "LOGOUT"}
            </button>

            <button
              onClick={handleContinue}
              disabled={signingOut}
              className="rounded-lg border border-fd-border bg-fd-foreground px-4 py-3 font-medium text-fd-background transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signingOut ? "Continuing..." : "YES, LOG IN"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
