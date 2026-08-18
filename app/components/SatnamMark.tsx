type SatnamMarkProps = {
  className?: string;
  title?: string;
};

export function SatnamMark({ className, title = "Satnam Satoshi" }: SatnamMarkProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <path
        d="M20 3.5C10.9 3.5 3.5 10.9 3.5 20c0 7.6 5.15 14 12.15 15.91"
        fill="none"
        stroke="#D4AF37"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
      <path
        d="M24.35 35.91C31.35 34 36.5 27.6 36.5 20 36.5 10.9 29.1 3.5 20 3.5"
        fill="none"
        stroke="#D4AF37"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
      <path
        d="M20 36.5V15"
        fill="none"
        stroke="#D4AF37"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
      <circle cx="20" cy="21" r="2.35" fill="#D4AF37" />
    </svg>
  );
}
