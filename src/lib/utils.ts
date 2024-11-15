// src/lib/utils.ts

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class names into a single string, using `clsx` to handle conditional classes
 * and `twMerge` to merge TailwindCSS classes intelligently.
 *
 * @param inputs - An array of class names, which may include false, undefined, or conditional classes.
 * @returns A single string of combined class names.
 */
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}
