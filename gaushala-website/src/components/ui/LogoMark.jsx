// A small hand-drawn cow-head mark used as the gaushala's logo placeholder.
// Kept as inline SVG (not an icon-font glyph) so it reads as a brand mark,
// not a generic UI icon.
export default function LogoMark({ className = "h-11 w-11" }) {
  return (
    <div
      className={`${className} shrink-0 rounded-full bg-brown-700 ring-2 ring-cream-200 shadow-soft flex items-center justify-center`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        className="h-[68%] w-[68%]"
      >
        <path
          d="M17 22c-4-3-9-1-9 3.5S12.5 31 17 29"
          stroke="#F8F1E7"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M47 22c4-3 9-1 9 3.5S51.5 31 47 29"
          stroke="#F8F1E7"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <ellipse cx="32" cy="35" rx="15.5" ry="13" fill="#F8F1E7" />
        <ellipse cx="32" cy="40" rx="7" ry="5" fill="#432D1C" />
        <circle cx="26" cy="30" r="2.3" fill="#432D1C" />
        <circle cx="38" cy="30" r="2.3" fill="#432D1C" />
        <path
          d="M28 40.5c1.2 1 2.8 1 4 0M32 40.5c1.2 1 2.8 1 4 0"
          stroke="#F8F1E7"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
