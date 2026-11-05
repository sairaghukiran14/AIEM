"use client";

import { useState, type ComponentProps } from "react";
import Link from "next/link";

/**
 * A Link that loads the whole next page as soon as the pointer or a finger shows intent, so the click often lands on
 * data that is already here. Doing this on hover rather than when a link scrolls into view keeps a page full of links
 * from sending the server a burst of full page renders.
 */
export function FastLink({ onMouseEnter, onTouchStart, onFocus, ...props }: ComponentProps<typeof Link>) {
  const [intent, setIntent] = useState(false);

  return (
    <Link
      {...props}
      prefetch={intent}
      onMouseEnter={(event) => {
        setIntent(true);
        onMouseEnter?.(event);
      }}
      onTouchStart={(event) => {
        setIntent(true);
        onTouchStart?.(event);
      }}
      onFocus={(event) => {
        setIntent(true);
        onFocus?.(event);
      }}
    />
  );
}
