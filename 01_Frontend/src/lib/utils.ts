import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Small helper that can be used to merge multiple tailwind
 * classes. Uses twMerge to ensure non breaking behaviour.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
