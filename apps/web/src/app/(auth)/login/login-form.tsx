"use client";

import { useState } from "react";
import { Icons } from "@/components/icons";
import { signInSocial } from "@/app/lib/auth-client";

interface LoginFormProps {
  challenge: string | null;
}

export function LoginForm({ challenge }: LoginFormProps) {
  const [loadingProvider, setLoadingProvider] = useState<
    "google" | "github" | null
  >(null);

  const handleSocialLogin = async (
    socialProvider: "google" | "github",
    codeChallenge: string,
  ) => {
    setLoadingProvider(socialProvider);
    signInSocial(socialProvider, codeChallenge);
  };

  return (
    <div className="flex flex-col flex-1 -translate-y-16">
      <section className="flex flex-col items-center justify-center flex-1 px-6 py-24">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-fd-foreground mb-2">
              Welcome to DBDesk
            </h1>
            <p className="text-lg text-fd-muted-foreground mb-6">
              The new experience for SQL database management.
            </p>
          </div>

          <div className="space-y-3 pt-4">
            <button
              onClick={() => handleSocialLogin("google", challenge || "")}
              disabled={loadingProvider !== null}
              className="w-full rounded-lg border border-fd-border bg-fd-secondary/30 px-4 py-3 font-medium text-fd-foreground transition-all hover:bg-fd-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:border-fd-border cursor-pointer"
            >
              <Icons.google className="size-5" />
              {loadingProvider === "google"
                ? "Signing in..."
                : "Continue with Google"}
            </button>

            <button
              onClick={() => handleSocialLogin("github", challenge || "")}
              disabled={loadingProvider !== null}
              className="w-full rounded-lg border border-fd-border bg-fd-secondary/30 px-4 py-3 font-medium text-fd-foreground transition-all hover:bg-fd-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:border-fd-border cursor-pointer"
            >
              <Icons.github className="size-5" />
              {loadingProvider === "github"
                ? "Signing in..."
                : "Continue with GitHub"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
