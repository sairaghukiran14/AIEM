import type { Block } from "@/content/types";

/**
 * Extra practice blocks kept apart from the lesson files, keyed by lesson slug.
 * `concept` extras are appended to the end of the concept section and
 * `underTheHood` extras to the end of the under-the-hood section.
 */
export type LessonExtras = Record<string, { concept?: Block[]; underTheHood?: Block[] }>;
