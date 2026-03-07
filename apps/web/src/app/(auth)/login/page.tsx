"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LoginForm } from "./login-form";
import { LoggedInView } from "./logged-in-view";
import { authClient } from "@/app/lib/auth-client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const challenge = searchParams.get("challenge");
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!challenge && !isPending) {
      router.replace("/");
    }
  }, [challenge, isPending, router]);

  if (isPending) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center -translate-y-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-fd-border border-t-fd-foreground" />
      </div>
    );
  }

  if (!challenge) {
    return null;
  }

  if (session?.user?.email) {
    return <LoggedInView email={session.user.email} challenge={challenge} />;
  }

  return <LoginForm challenge={challenge} />;
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col flex-1 items-center justify-center -translate-y-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-fd-border border-t-fd-foreground" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
