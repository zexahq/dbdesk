import { cn } from "@/lib/utils";
import { StripedPattern } from "./stripped-pattern";
import Image from "next/image";

interface FeatureItemProps {
  title: string;
  description: string;
  imageSrc?: string;
  alignment: "left" | "right";
  comingSoon?: boolean;
}

export function FeatureItem({
  title,
  description,
  imageSrc,
  alignment,
  comingSoon,
}: FeatureItemProps) {
  if (comingSoon) {
    return (
      <div className="flex flex-col space-y-4 p-6 rounded-2xl border border-fd-border bg-fd-card/50">
        <div className="inline-flex self-start items-center justify-center px-2.5 py-0.5 text-xs font-medium bg-fd-primary/10 text-fd-primary rounded-full border border-fd-primary/20">
          Coming Soon
        </div>
        <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-fd-foreground to-fd-muted-foreground">
          {title}
        </h3>
        <p className="text-fd-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-8 md:gap-16 items-center",
        alignment === "left" ? "md:flex-row" : "md:flex-row-reverse"
      )}
    >
      {/* Image Container */}
      <div className="w-full md:w-1/2 relative p-4 md:p-6 border rounded-lg border-dashed border-fd-border">
        <StripedPattern
          width={16}
          height={16}
          className="opacity-50 text-fd-muted-foreground/20"
        />
        <div className="relative z-20 bg-fd-background border border-fd-border shadow-2xl overflow-hidden rounded-lg">
          {imageSrc && (
            <Image
              src={imageSrc}
              alt={title}
              width={800}
              height={600}
              className="w-full h-auto"
            />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="w-full md:w-1/2 space-y-4">
        <h3 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-fd-foreground to-fd-muted-foreground">
          {title}
        </h3>
        <p className="text-lg text-fd-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
