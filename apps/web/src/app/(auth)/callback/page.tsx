"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { authClient } from "@/app/lib/auth-client";

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const challenge = searchParams.get("challenge");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      if (!challenge) {
        router.replace("/");
        return;
      }

      try {
        const session = await authClient.getSession();
        const token = session?.data?.session?.token;

        if (!token) {
          throw new Error("No session token found");
        }

        const deepLinkUrl = `dbdesk://session?token=${encodeURIComponent(token)}&challenge=${encodeURIComponent(challenge)}`;
        window.location.href = deepLinkUrl;
      } catch (err) {
        console.error("Callback error:", err);
        setError("Failed to complete authentication. Please try again.");
      }
    };

    handleCallback();
  }, [challenge, router]);

  if (error) {
    return (
      <div className="flex flex-col flex-1 -translate-y-16">
        <section className="flex flex-col items-center justify-center flex-1 px-6 py-24">
          <div className="w-full max-w-md space-y-6">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-fd-foreground mb-2">
                Authentication Failed
              </h1>
              <p className="text-fd-muted-foreground mb-6">{error}</p>
            </div>

            <button
              onClick={() => router.push("/")}
              className="w-full rounded-lg border border-fd-border bg-fd-secondary/30 px-4 py-3 font-medium text-fd-foreground transition-all hover:bg-fd-secondary"
            >
              Go back
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 -translate-y-16">
      <section className="flex flex-col items-center justify-center flex-1 px-6 py-24">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-fd-foreground mb-2">
              Completing Login
            </h1>
            <p className="text-fd-muted-foreground mb-6">
              Please wait while we redirect you to DBDesk...
            </p>
          </div>

          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-fd-border border-t-fd-foreground" />
          </div>
        </div>
      </section>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col flex-1 -translate-y-16">
          <section className="flex flex-col items-center justify-center flex-1 px-6 py-24">
            <div className="w-full max-w-md space-y-6">
              <div className="flex justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-fd-border border-t-fd-foreground" />
              </div>
            </div>
          </section>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
