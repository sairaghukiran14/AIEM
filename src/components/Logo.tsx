import { FastLink as Link } from "@/components/FastLink";

const SIZES = {
  sm: "px-2 py-1 text-[13px] rounded-md",
  md: "px-2.5 py-1.5 text-[15px] rounded-lg",
  lg: "px-3.5 py-2 text-xl rounded-xl",
} as const;

/** The AIEM wordmark: white letters on an ink block. */
export function LogoMark({
  size = "md",
  inverted = false,
}: {
  size?: keyof typeof SIZES;
  /** White block with ink letters, for use on dark backgrounds. */
  inverted?: boolean;
}) {
  return (
    <span
      className={`inline-block font-black leading-none tracking-[0.12em] ${SIZES[size]} ${
        inverted ? "bg-white text-black" : "bg-text text-white"
      }`}
    >
      AIEM
    </span>
  );
}

export function Logo({ size = "md", href = "/" }: { size?: keyof typeof SIZES; href?: string }) {
  return (
    <Link href={href} aria-label="AIEM — AI Engineering Mastery, home" className="inline-flex">
      <LogoMark size={size} />
    </Link>
  );
}
