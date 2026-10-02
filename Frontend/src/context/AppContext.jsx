import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { authService, api, listingService, userService, cartService } from '../services';
import { setAccessToken, clearAccessToken } from '../services/api';
import { transformListingToProduct } from '../utils/transforms';
import { useGeolocation } from '../Components/maps/useGeolocation';

export const AppContext = createContext();

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppContextProvider');
  }
  return context;
};

const AppContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const { getCurrentLocation } = useGeolocation();

  // Initialize cart from localStorage
  const [cartItems, setCartItems] = useState(() => {
    try {
      const savedCart = localStorage.getItem('cartItems');
      return savedCart ? JSON.parse(savedCart) : {};
    } catch {
      return {};
    }
  });

  // Multi-role state
  const [activeRole, setActiveRole] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);

  // Cart sync refs
  const syncTimeoutRef = useRef(null);
  const isSyncingRef = useRef(false);

  // Clear all auth state helper
  const clearAuthState = useCallback(() => {
    clearAccessToken();
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    setActiveRole(null);
    setAvailableRoles([]);
  }, []);

  // Check for existing session on mount. The access token lives only in memory
  // (see services/api.js), so a page reload always starts with none - the only
  // way to know whether the user is still logged in is to attempt a silent
  // refresh against the httpOnly refresh-token cookie the backend set.
  //
  // This used to skip the refresh attempt entirely whenever localStorage had
  // no stored user, treating that as "never logged in on this browser." But
  // localStorage.user is only ever (re)written here and at login - the
  // reactive 401-retry refresh in services/api.js's interceptor restores the
  // in-memory session mid-visit without touching localStorage at all. So any
  // page load after that reactive path had already run once - a fresh tab, a
  // bookmark, a shared link - starts this check with no stored user even
  // though the httpOnly cookie is still perfectly valid, and used to render
  // logged-out despite a real, live session (found live on chopnow.app,
  // 2026-09-26: a raw fetch to /api/users/refresh-token bypassing this gate
  // returned 200 with a fresh token pair while the app showed "Login/Sign
  // Up"). The httpOnly cookie is the actual source of truth, not
  // localStorage, so this now always attempts the refresh; the cost for a
  // genuinely logged-out visitor is one cheap POST that comes back 400.
  useEffect(() => {
    const checkAuth = async () => {
      const storedUser = localStorage.getItem('user');
      let userData = null;
      if (storedUser) {
        try {
          userData = JSON.parse(storedUser);
        } catch {
          userData = null;
        }
      }

      try {
        // silent:true - a failed refresh here is the normal, expected case
        // for any logged-out visitor (backend returns 400 "Refresh token is
        // required"/similar when there's no cookie at all). Without this,
        // that 400 falls through api.js's response interceptor's generic
        // catch-all (only 401 is treated specially there) and shows the raw
        // backend message as an error toast to every first-time visitor on
        // page load - confirmed live, 2026-09-26, in a real browser hitting
        // the production homepage logged out.
        const { data } = await api.post('/api/users/refresh-token', {}, { silent: true });
        setAccessToken(data.token);

        // Validate by fetching a fresh profile.
        try {
          const profile = await authService.getProfile();
          const freshUser = { ...userData, ...profile };
          localStorage.setItem('user', JSON.stringify(freshUser));
          setUser(freshUser);
          setIsAuthenticated(true);
          setActiveRole(freshUser.activeRole || freshUser.role || 'consumer');
          setAvailableRoles(freshUser.roles || [freshUser.role || 'consumer']);
        } catch {
          // Profile fetch failed but the refresh itself succeeded - use
          // stored data if there was any (userData can now be null here,
          // since the refresh is no longer gated on localStorage having a
          // stored user - see the comment above).
          setUser(userData || {});
          setIsAuthenticated(true);
          setActiveRole(userData?.activeRole || userData?.role || 'consumer');
          setAvailableRoles(userData?.roles || [userData?.role || 'consumer']);
        }
      } catch {
        // No valid refresh-token cookie (expired, revoked, or never existed here) -- session is dead.
        // This is an expected, common outcome (e.g. the 7-day cookie simply expired), not an error.
        clearAuthState();
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [clearAuthState]);

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('cartItems', JSON.stringify(cartItems));
    } catch (error) {
      console.error('Failed to save cart to localStorage:', error);
    }
  }, [cartItems]);

  // Debounced sync cart to backend (for authenticated users)
  const syncCartToBackend = useCallback(
    async (cart) => {
      if (!isAuthenticated || isSyncingRef.current) return;

      // Clear any pending sync
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      // Debounce: wait 1 second before syncing to avoid excessive API calls
      syncTimeoutRef.current = setTimeout(async () => {
        try {
          isSyncingRef.current = true;
          await cartService.setCart(cart);
        } catch (error) {
          console.error('Failed to sync cart to backend:', error);
        } finally {
          isSyncingRef.current = false;
        }
      }, 1000);
    },
    [isAuthenticated]
  );

  // Sync cart changes to backend when authenticated
  useEffect(() => {
    if (isAuthenticated && Object.keys(cartItems).length >= 0) {
      syncCartToBackend(cartItems);
    }
  }, [cartItems, isAuthenticated, syncCartToBackend]);

  // Sync local cart with backend on login
  const syncCartOnLogin = useCallback(async () => {
    try {
      const localCart = localStorage.getItem('cartItems');
      const parsedCart = localCart ? JSON.parse(localCart) : {};

      if (Object.keys(parsedCart).length > 0) {
        // Merge local cart with server cart
        const result = await cartService.syncCart(parsedCart);
        if (result.cart) {
          // result.cart is already { listingId: quantity } format
          setCartItems(result.cart);
        }
      } else {
        // No local cart, fetch from server
        const result = await cartService.getCart();
        if (result.cart) {
          // result.cart is already { listingId: quantity } format
          setCartItems(result.cart);
        }
      }
    } catch (error) {
      console.error('Failed to sync cart on login:', error);
      // Keep local cart if sync fails
    }
  }, []);

  // Login function
  const login = async (email, password, preferredRole) => {
    try {
      const data = await authService.login({ email, password });

      // Extract user data (everything except token and refreshToken)
      const { token, refreshToken: _refreshToken, ...userData } = data;

      // Set role state from response
      const userRoles = userData.roles || [userData.role || 'consumer'];
      const userActiveRole = userData.activeRole || userData.role || userRoles[0];

      // If user has preferred role and has it available, switch to it
      if (preferredRole && userRoles.includes(preferredRole) && preferredRole !== userActiveRole) {
        // Switch role after login
        try {
          const switchResult = await userService.switchRole(preferredRole);
          userData.activeRole = switchResult.activeRole;
          userData.roles = switchResult.roles;
        } catch (switchError) {
          console.warn('Could not switch to preferred role:', switchError);
        }
      }

      setAccessToken(token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
      setAuthError(null);
      setActiveRole(userData.activeRole || userActiveRole);
      setAvailableRoles(userData.roles || userRoles);

      // Sync cart with backend after login
      await syncCartOnLogin();

      return { user: userData, token };
    } catch (error) {
      console.error('Login Check failed', error);
      throw error;
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      const data = await authService.register(userData);

      // Extract user data (everything except token, refreshToken, and message)
      const { token, refreshToken: _refreshToken, message, ...userInfo } = data;

      // Auto-login after registration
      setAccessToken(token);
      localStorage.setItem('user', JSON.stringify(userInfo));
      setUser(userInfo);
      setIsAuthenticated(true);
      setAuthError(null);

      // Set role state
      const userRoles = userInfo.roles || [userInfo.role || 'consumer'];
      const userActiveRole = userInfo.activeRole || userInfo.role || userRoles[0];
      setActiveRole(userActiveRole);
      setAvailableRoles(userRoles);

      // Sync cart with backend after registration
      await syncCartOnLogin();

      return { user: userInfo, token, message };
    } catch (error) {
      console.error('Registration failed', error);
      throw error;
    }
  };

  // Google Login function
  const googleAuth = async (idToken) => {
    try {
      // M21: use the shared authService.googleLogin() instead of duplicating
      // the raw api.post call here.
      const data = await authService.googleLogin({ idToken });

      // Extract user data (everything except token and refreshToken)
      const { token, refreshToken: _refreshToken, ...userData } = data;

      setAccessToken(token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
      setAuthError(null);

      // Set role state
      const userRoles = userData.roles || [userData.role || 'consumer'];
      const userActiveRole = userData.activeRole || userData.role || userRoles[0];
      setActiveRole(userActiveRole);
      setAvailableRoles(userRoles);

      // Sync cart with backend after Google login
      await syncCartOnLogin();

      toast.success('Login successful!');
      return { user: userData, token };
    } catch (error) {
      console.error('Google Login failed', error);
      // authService.googleLogin() throws the response body directly (not a
      // raw axios error), so error.message covers that case; the
      // error.response?.data?.message check stays for safety in case
      // something upstream ever throws a raw axios error instead.
      toast.error(error.response?.data?.message || error.message || 'Google Login failed');
      throw error;
    }
  };

  // Switch active role
  const switchRole = async (newRole) => {
    try {
      const result = await userService.switchRole(newRole);

      // Update local state with all user data from result
      const updatedUser = {
        ...user,
        ...result.user,
        activeRole: result.activeRole,
        role: result.activeRole, // Ensure role is also updated for backward compatibility
        roles: result.roles || user.roles,
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setActiveRole(result.activeRole);
      setAvailableRoles(result.roles || user.roles || []);

      // Only show toast for consumer/business switch, not admin
      if (newRole !== 'admin') {
        toast.success(`Switched to ${newRole === 'consumer' ? 'Buyer' : 'Business'} mode`);
      }
      return result;
    } catch (error) {
      console.error('Role switch failed', error);
      toast.error(error.message || 'Failed to switch role');
      throw error;
    }
  };

  // Add business role to existing consumer
  const addBusinessRole = async (switchToNew = true) => {
    try {
      const result = await userService.addRole('business_owner', switchToNew);

      // Update local state
      const updatedUser = { ...user, ...result.user };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setAvailableRoles(result.roles);
      if (switchToNew) {
        setActiveRole(result.activeRole);
      }

      toast.success('Business role added successfully!');
      return result;
    } catch (error) {
      console.error('Add role failed', error);
      toast.error(error.message || 'Failed to add business role');
      throw error;
    }
  };

  // Add rider role to existing consumer
  const addRiderRole = async (switchToNew = true) => {
    try {
      const result = await userService.addRole('rider', switchToNew);

      // Update local state
      const updatedUser = { ...user, ...result.user };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setAvailableRoles(result.roles);
      if (switchToNew) {
        setActiveRole(result.activeRole);
      }

      toast.success('Rider role activated successfully!');
      return result;
    } catch (error) {
      console.error('Add rider role failed', error);
      toast.error(error.message || 'Failed to activate rider role');
      throw error;
    }
  };

  // Refresh fresh user data
  const refreshUser = async () => {
    try {
      const profile = await authService.getProfile();
      const freshUser = { ...user, ...profile };
      localStorage.setItem('user', JSON.stringify(freshUser));
      setUser(freshUser);
      setAvailableRoles(freshUser.roles || [freshUser.role || 'consumer']);
      return freshUser;
    } catch (error) {
      console.error('Refresh user failed', error);
      throw error;
    }
  };

  // Check if user has a specific role
  const hasRole = (role) => {
    return availableRoles.includes(role);
  };

  // Logout function
  const logout = async () => {
    // Best-effort: clear the httpOnly refresh-token cookie server-side so it
    // can't be replayed later. Local state is cleared either way below, even
    // if this call fails (e.g. offline, or the access token already expired).
    try {
      await authService.logoutSession('current');
    } catch (err) {
      console.error('Server-side logout failed (clearing local session anyway)', err);
    }

    clearAccessToken();
    localStorage.removeItem('user');
    localStorage.removeItem('cartItems'); // Clear cart on logout
    setUser(null);
    setIsAuthenticated(false);
    setActiveRole(null);
    setAvailableRoles([]);
    setCartItems({}); // Clear cart state
    setAuthError(null);
    toast.success('Logged out successfully');
    window.location.href = '/login';
  };

  // Clear cart function
  const clearCart = async () => {
    setCartItems({});
    localStorage.removeItem('cartItems');
    // Clear backend cart if authenticated
    if (isAuthenticated) {
      try {
        await cartService.clearCart();
      } catch (error) {
        console.error('Failed to clear backend cart:', error);
      }
    }
  };

  // Fetch products from backend API
  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      // silent: true — this is a background prefetch; errors are handled below,
      // no toast needed (avoids false "no connection" popup on mobile cold-starts)
      const response = await listingService.getListings({ status: 'active' }, { silent: true });
      // Transform backend listing format to frontend product format using utility
      const listings = response.listings || response || [];
      const transformedProducts = listings
        .map((listing) => {
          const transformed = transformListingToProduct(listing);
          // Skip null/invalid transforms
          if (!transformed) return null;
          return {
            _id: transformed.id,
            name: transformed.name || 'Unknown Product',
            description: transformed.description || '',
            category: transformed.category || 'other',
            price: transformed.originalPrice || transformed.price || 0,
            offerPrice: transformed.price || 0,
            image: transformed.images || [],
            vendor: transformed.businessName || 'Unknown Vendor',
            vendorId: transformed.businessId,
            quantity: transformed.quantity || 0,
            inStock: transformed.isAvailable !== false,
            status: transformed.status || 'active',
            pickupTime:
              transformed.pickupFrom && transformed.pickupTo
                ? `${new Date(transformed.pickupFrom).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(transformed.pickupTo).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Flexible',
            fulfillmentType: 'pickup',
            dietary: [],
            rating: transformed.rating || 0,
            reviews: transformed.reviewCount || 0,
            availableUntil: transformed.availableUntil || null,
            cartCount: transformed.cartCount || 0,
            soldCount: transformed.soldCount || 0,
            totalQuantity: transformed.totalQuantity || 0,
            createdAt: transformed.createdAt,
            distance: null,
          };
        })
        .filter(Boolean); // Remove null entries
      setProducts(transformedProducts);
    } catch (e) {
      console.error('Error fetching products:', e);
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // If the browser grants geolocation, enrich the already-loaded products with
  // real per-listing distance (km) from the nearby endpoint. Runs after the
  // initial generic fetch so the shop page never blocks on a permission
  // prompt; if permission is denied or unavailable, products simply keep
  // distance: null and no badge/sort-by-distance data is shown.
  useEffect(() => {
    getCurrentLocation(
      async ({ lat, lng }) => {
        try {
          const response = await listingService.getNearbyListings(
            lat,
            lng,
            { status: 'active', limit: 100 },
            { silent: true }
          );
          const nearby = response.listings || response || [];
          const distanceById = new Map(nearby.map((l) => [l._id, l.distance]));
          if (distanceById.size > 0) {
            setProducts((prev) =>
              prev.map((p) =>
                distanceById.has(p._id) ? { ...p, distance: distanceById.get(p._id) } : p
              )
            );
          }
        } catch (e) {
          console.error('Error fetching nearby distance data:', e);
        }
      },
      () => {
        // Permission denied or geolocation unavailable - no-op, products keep distance: null.
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cart Logic (Local state for now, can be moved to backend later)
  const addToCart = (itemId) => {
    let cartData = structuredClone(cartItems);
    if (cartData[itemId]) {
      cartData[itemId] += 1;
    } else {
      cartData[itemId] = 1;
    }
    setCartItems(cartData);
    toast.success('Added to cart');
  };

  const updateCartItem = (itemId, quantity) => {
    let cartData = structuredClone(cartItems);
    cartData[itemId] = quantity;
    setCartItems(cartData);
    toast.success('Cart updated');
  };

  const removeFromCart = (itemId) => {
    let cartData = structuredClone(cartItems);
    if (cartData[itemId]) {
      cartData[itemId] -= 1;
      if (cartData[itemId] <= 0) {
        delete cartData[itemId];
      }
    }
    toast.success('Removed from cart');
    setCartItems(cartData);
  };

  const removeAllFromCart = (itemId) => {
    let cartData = structuredClone(cartItems);
    if (cartData[itemId]) {
      delete cartData[itemId];
      toast.success('Removed from cart');
    }
    setCartItems(cartData);
  };

  const getTotalCartItems = () => {
    let totalItems = 0;
    for (const item in cartItems) {
      if (cartItems[item] > 0) {
        totalItems += cartItems[item];
      }
    }
    return totalItems;
  };

  const getCartAmount = () => {
    let totalAmount = 0;
    for (const items in cartItems) {
      let itemInfo = products.find((product) => product._id === items);
      if (itemInfo && cartItems[items] > 0) {
        totalAmount += itemInfo.offerPrice * cartItems[items];
      }
    }
    return Math.floor(totalAmount * 100) / 100;
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    authError,
    login,
    register,
    googleAuth,
    logout,
    // Multi-role support
    activeRole,
    availableRoles,
    switchRole,
    addBusinessRole,
    addRiderRole,
    refreshUser,
    hasRole,
    // Products
    products,
    productsLoading,
    refreshProducts: fetchProducts,
    searchQuery,
    setSearchQuery,
    addToCart,
    updateCartItem,
    removeFromCart,
    removeAllFromCart,
    cartItems,
    getTotalCartItems,
    getCartAmount,
    clearCart,
    placeOrder: async (orderData) => {
      try {
        // api instance handles headers automatically via interceptor if token exists
        const { data } = await api.post('/api/orders', orderData);

        // Clear cart after successful order
        clearCart();
        toast.success('Order placed successfully!');
        return data;
      } catch (error) {
        console.error('Order placement failed', error);
        toast.error(error.response?.data?.message || 'Failed to place order');
        throw error;
      }
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContextProvider;
