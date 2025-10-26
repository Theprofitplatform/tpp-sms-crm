import { create } from 'zustand';
import type { Project } from '@/types';

interface AppState {
  // UI State
  sidebarOpen: boolean;
  theme: 'light' | 'dark';

  // Current selections
  currentProject: Project | null;

  // Actions
  toggleSidebar: () => void;
  toggleTheme: () => void;
  setCurrentProject: (project: Project | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  theme: 'light',
  currentProject: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
  setCurrentProject: (project) => set({ currentProject: project }),
}));
