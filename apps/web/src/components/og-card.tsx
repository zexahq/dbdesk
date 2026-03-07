import React from "react";
import { Logo } from "./logo";

interface OGCardProps {
  title: string;
  subtitle: string;
  brandName: string;
  logoSrc?: string;
}

export const OGCard: React.FC<OGCardProps> = ({
  title,
  subtitle,
  brandName,
  logoSrc,
}) => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "black",
        color: "white",
        padding: "6%",
        justifyContent: "space-between",
        position: "relative",
      }}
    >
      {/* 1. Background System */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
        }}
      >
        {/* Base Gradient */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "linear-gradient(to bottom right, #000000, #0a0a0a)",
          }}
        />

        {/* The Grid Pattern */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.2,
            backgroundImage: `linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)`,
            backgroundSize: "64rem 64rem",
          }}
        />

        {/* Optional: Radial glow on the grid side to give it depth */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            right: 0,
            transform: "translateY(-50%) translateX(25%)",
            width: "80%",
            height: "120%",
            backgroundColor: "rgba(23, 37, 84, 0.2)", // Darker blue (blue-950)
            filter: "blur(120px)",
            borderRadius: "9999px", // rounded-full
            mixBlendMode: "screen",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* 2. Top Section: Title */}
      <div style={{ display: "flex", maxWidth: "75%", position: "relative" }}>
        <h1
          style={{
            fontFamily: '"Plus Jakarta Sans"',
            fontSize: "80px",
            fontWeight: 700, // Bolder
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: "white",
            margin: 0,
            whiteSpace: "pre-wrap",
          }}
        >
          {title}
        </h1>
      </div>

      {/* 3. Bottom Section: Logo & Subtitle */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          width: "100%",
          marginTop: "auto",
          paddingTop: "3rem",
          position: "relative",
        }}
      >
        {/* Brand/Logo Component */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* Replaced SVG Logo with a simple white square to avoid rendering issues */}
          <Logo
            src={logoSrc}
            width={48}
            height={48}
            style={{
              width: "48px",
              height: "48px",
            }}
          />
          <span
            style={{
              fontFamily: '"Plus Jakarta Sans"',
              fontSize: "30px",
              fontWeight: 700, // Bolder
              letterSpacing: "-0.02em",
              color: "white",
            }}
          >
            {brandName}
          </span>
        </div>

        {/* Subtitle Component */}
        <div style={{ display: "flex" }}>
          <span
            style={{
              fontFamily: '"Plus Jakarta Sans"',
              fontSize: "24px",
              fontWeight: 200, // Slightly bolder
              textTransform: "uppercase",
              letterSpacing: "0.01em",
              color: "#737373", // neutral-500
            }}
          >
            {subtitle}
          </span>
        </div>
      </div>
    </div>
  );
};
