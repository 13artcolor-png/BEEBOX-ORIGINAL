// Export all contexts and their hooks
export { AuthProvider, useAuth } from './AuthContext';
export { BoxesProvider, useBoxes } from './BoxesContext';
export { TenantsProvider, useTenants } from './TenantsContext';
export { AgenciesProvider, useAgencies } from './AgenciesContext';
export { DataProvider, useData } from './DataContext';
export { UIProvider, useUI } from './UIContext';

// Export a combined provider for convenience
import React, { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { BoxesProvider } from './BoxesContext';
import { TenantsProvider } from './TenantsContext';
import { AgenciesProvider } from './AgenciesContext';
import { DataProvider } from './DataContext';
import { UIProvider } from './UIContext';

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <AuthProvider>
      <UIProvider>
        <BoxesProvider>
          <TenantsProvider>
            <AgenciesProvider>
              <DataProvider>
                {children}
              </DataProvider>
            </AgenciesProvider>
          </TenantsProvider>
        </BoxesProvider>
      </UIProvider>
    </AuthProvider>
  );
};
