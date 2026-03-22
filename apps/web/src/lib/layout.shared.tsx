import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { Navbar } from "@/app/(home)/components/navbar";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "DBDesk",
      component: <Navbar />,
    },
    searchToggle: {
      enabled: false,
    },
  };
}
