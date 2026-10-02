import React, { createContext, useContext, useState, useEffect } from 'react';

const AdminModeContext = createContext();

export const AdminModeProvider = ({ children, userRole }) => {
  // Default to 'website' mode for admins, 'shop' mode for business owners
  const [adminMode, setAdminMode] = useState(userRole === 'admin' ? 'website' : 'shop');

  // Reset to shop mode when user changes or if non-admin tries to access website mode
  useEffect(() => {
    if (userRole !== 'admin' && adminMode === 'website') {
      setAdminMode('shop');
    }
  }, [userRole, adminMode]);

  const toggleAdminMode = () => {
    // Only allow toggling to 'website' mode if user is admin
    setAdminMode((prev) => {
      if (prev === 'shop' && userRole === 'admin') {
        return 'website';
      } else if (prev === 'website') {
        return 'shop';
      }
      return prev; // Stay in current mode if not admin
    });
  };

  // Safe setter that enforces role restrictions
  const safeSetAdminMode = (mode) => {
    if (mode === 'website' && userRole !== 'admin') {
      console.warn('Non-admin users cannot access website admin mode');
      return;
    }
    setAdminMode(mode);
  };

  return (
    <AdminModeContext.Provider
      value={{
        adminMode,
        setAdminMode: safeSetAdminMode,
        toggleAdminMode,
        isAdmin: userRole === 'admin',
      }}
    >
      {children}
    </AdminModeContext.Provider>
  );
};

export const useAdminMode = () => {
  const context = useContext(AdminModeContext);
  if (!context) {
    throw new Error('useAdminMode must be used within AdminModeProvider');
  }
  return context;
};
