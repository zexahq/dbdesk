import React from "react";

interface LogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
}

export const Logo = ({
  className,
  src = "/dbdesk-logo.svg",
  ...props
}: LogoProps) => {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="DBDesk Logo" className={className} {...props} />;
};
