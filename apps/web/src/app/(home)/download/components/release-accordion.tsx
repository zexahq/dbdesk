"use client";

import { useState } from "react";
import type { Release } from "@/lib/github";
import { ReleaseItem } from "./release-item";

interface ReleaseAccordionProps {
  releases: Release[];
}

export function ReleaseAccordion({ releases }: ReleaseAccordionProps) {
  const [expandedId, setExpandedId] = useState<number | null>(
    releases[0]?.id || null
  );

  return (
    <div className="space-y-4">
      {releases.map((release) => (
        <ReleaseItem
          key={release.id}
          release={release}
          isExpanded={expandedId === release.id}
          onToggle={() =>
            setExpandedId(expandedId === release.id ? null : release.id)
          }
        />
      ))}
    </div>
  );
}
