import { create } from 'zustand';
import { Business } from '@/types';
import { storageService } from '@/storage/asyncStorage';

interface BusinessState {
  businesses: Business[];
  selectedBusiness: Business | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadBusinesses: () => Promise<void>;
  createBusiness: (business: Omit<Business, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Business>;
  updateBusiness: (id: string, updates: Partial<Omit<Business, 'id' | 'createdAt'>>) => Promise<void>;
  deleteBusiness: (id: string) => Promise<void>;
  selectBusiness: (business: Business | null) => void;
  clearError: () => void;
}

export const useBusinessStore = create<BusinessState>((set, get) => ({
  businesses: [],
  selectedBusiness: null,
  isLoading: false,
  error: null,

  loadBusinesses: async () => {
    set({ isLoading: true, error: null });
    try {
      const businesses = await storageService.getBusinesses();
      set({ businesses, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createBusiness: async (business) => {
    set({ isLoading: true, error: null });
    try {
      // Enforce single business - check if one already exists
      const existingBusinesses = await storageService.getBusinesses();
      if (existingBusinesses.length > 0) {
        throw new Error('Only one business is allowed. Please update the existing business instead.');
      }

      const id = `business_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      const newBusiness: Business = {
        id,
        ...business,
        createdAt: now,
        updatedAt: now,
      };

      const businesses = await storageService.getBusinesses();
      businesses.push(newBusiness);
      await storageService.saveBusinesses(businesses);

      set((state) => ({
        businesses: [newBusiness, ...state.businesses],
        isLoading: false,
      }));
      return newBusiness;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateBusiness: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const businesses = await storageService.getBusinesses();
      const index = businesses.findIndex((b) => b.id === id);
      if (index === -1) throw new Error('Business not found');

      businesses[index] = {
        ...businesses[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await storageService.saveBusinesses(businesses);

      set((state) => ({
        businesses: state.businesses.map((b) => (b.id === id ? businesses[index] : b)),
        selectedBusiness: state.selectedBusiness?.id === id ? businesses[index] : state.selectedBusiness,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteBusiness: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const businesses = await storageService.getBusinesses();
      const filtered = businesses.filter((b) => b.id !== id);
      await storageService.saveBusinesses(filtered);

      set((state) => ({
        businesses: state.businesses.filter((b) => b.id !== id),
        selectedBusiness: state.selectedBusiness?.id === id ? null : state.selectedBusiness,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  selectBusiness: (business) => {
    set({ selectedBusiness: business });
  },

  clearError: () => {
    set({ error: null });
  },
}));
