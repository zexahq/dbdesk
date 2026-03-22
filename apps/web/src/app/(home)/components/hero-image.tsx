import Image from "next/image";
import { StripedPattern } from "./stripped-pattern";

export default function HeroImage() {
  return (
    <div className="relative w-full p-4 md:p-6 border-y border-dashed border-fd-border">
      <StripedPattern
        width={16}
        height={16}
        className="opacity-50 text-fd-muted-foreground/20"
      />
      <div className="relative z-20 bg-fd-background border border-fd-border shadow-2xl overflow-hidden">
        <Image
          src="/dbdesk.png"
          alt="DBDesk Dashboard"
          width={1920}
          height={1080}
          className="w-full h-auto"
          priority
        />
      </div>
    </div>
  );
}
