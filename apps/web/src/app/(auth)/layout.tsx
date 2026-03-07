import { Logo } from "@/components/logo";
import React from "react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "DBDesk Login",
  description: "Login to your DBDesk account to continue",
};

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <nav className="flex w-full items-center px-6 py-4 ">
        <div className="flex gap-2 items-center">
          <Logo className="w-8 h-8" />
          <Link
            href="/"
            className="text-2xl flex items-center font-bold tracking-tight"
          >
            DBDesk
          </Link>
        </div>
      </nav>
      {children}
    </div>
  );
};

export default AuthLayout;
