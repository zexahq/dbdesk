import Link from "next/link";
import { Logo } from "@/components/logo";
import { Icons } from "@/components/icons";

export const Navbar = () => {
  return (
    <nav className="flex w-full items-center justify-between px-6 py-4 border-b border-dashed border-fd-border relative">
      <div className="flex gap-2 items-center">
        <Logo className="w-8 h-8" />
        <Link
          href="/"
          className="text-2xl flex items-center font-bold tracking-tight"
        >
          DBDesk
        </Link>
      </div>
      <div className="hidden sm:flex absolute left-1/2 transform -translate-x-1/2 items-center gap-6">
        <Link
          href="/#features"
          className="text-sm font-medium text-fd-foreground hover:text-fd-foreground/80 transition-colors"
        >
          Features
        </Link>
        <Link
          href="/download"
          className="text-sm font-medium text-fd-foreground hover:text-fd-foreground/80 transition-colors"
        >
          Download
        </Link>
      </div>
      <div className="flex items-center">
        <Link
          href="https://github.com/zexahq/dbdesk"
          target="_blank"
          rel="noopener noreferrer"
          className="text-fd-foreground hover:text-fd-foreground/80 transition-colors"
        >
          <Icons.github className="size-6" />
        </Link>
      </div>
    </nav>
  );
};
