import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const phoneRegex = /^(010|011|012|015)\d{8}$/;
export const nationalIdRegex = /^\d{14}$/;
