import * as React from "react";

interface KineticLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

export function KineticLogo({
  className = "h-5 w-5",
  size = 20,
  ...props
}: KineticLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Precision geometric kinetic mark: two converging momentum vectors */}
      <path
        d="M3 4.5L13.5 12L3 19.5V15L9 12L3 9V4.5Z"
        fill="currentColor"
        className="text-primary"
      />
      <path
        d="M10.5 4.5L21 12L10.5 19.5V15L16.5 12L10.5 9V4.5Z"
        fill="currentColor"
        fillOpacity="0.4"
      />
    </svg>
  );
}

export function KineticWordmark({
  className = "",
  showTagline = false,
}: {
  className?: string;
  showTagline?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background shadow-sm">
        <KineticLogo className="h-4 w-4 text-background" size={16} />
      </div>
      <div className="flex flex-col">
        <span className="font-semibold text-base tracking-tight text-foreground leading-none">
          Kinetic
        </span>
        {showTagline && (
          <span className="text-[11px] text-muted-foreground tracking-normal mt-0.5">
            Move work forward, together.
          </span>
        )}
      </div>
    </div>
  );
}
