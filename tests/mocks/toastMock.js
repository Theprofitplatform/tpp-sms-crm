// Mock for @/hooks/use-toast
import { jest } from '@jest/globals';

export const toast = jest.fn();

export function useToast() {
  return { toast };
}
