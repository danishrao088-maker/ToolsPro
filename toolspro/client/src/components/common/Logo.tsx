interface LogoProps {
  className?: string;
}

export function Logo({ className = "" }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="toolspro-logo" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#5B35F5" />
            <stop offset="1" stopColor="#3B82F6" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill="url(#toolspro-logo)" />
        <rect x="8" y="9" width="16" height="4" rx="2" fill="#fff" />
        <rect x="14" y="9" width="4" height="15" rx="2" fill="#fff" />
      </svg>
      <span className="text-xl font-bold tracking-tight text-heading">
        Tools<span className="text-link">Pro</span>
      </span>
    </span>
  );
}