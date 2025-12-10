import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface SelectedUnitContextType {
  selectedUnit: number | null;
  setSelectedUnit: (unitId: number | null) => void;
}

const SelectedUnitContext = createContext<SelectedUnitContextType | undefined>(undefined);

// Export hook first for Fast Refresh compatibility
export function useSelectedUnit(): SelectedUnitContextType {
  const context = useContext(SelectedUnitContext);
  if (context === undefined) {
    throw new Error('useSelectedUnit must be used within a SelectedUnitProvider');
  }
  return context;
}

// Export provider component
export function SelectedUnitProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null);

  // Set default selected unit when user data is available
  useEffect(() => {
    if (user && user.units && user.units.length > 0) {
      // If user has only 1 unit, set it as default
      if (user.units.length === 1) {
        setSelectedUnit(user.units[0].id);
      } else if (!selectedUnit) {
        // If user has multiple units and none is selected, select the first one
        setSelectedUnit(user.units[0].id);
      }
    } else if (user && user.unit) {
      // Fallback to legacy single unit field
      setSelectedUnit(user.unit.id);
    }
  }, [user]);

  return (
    <SelectedUnitContext.Provider value={{ selectedUnit, setSelectedUnit }}>
      {children}
    </SelectedUnitContext.Provider>
  );
}
