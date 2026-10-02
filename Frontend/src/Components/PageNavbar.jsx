import { assets } from '../assets/assets';
import {
  Bell,
  Search,
  ShoppingCart,
  User,
  X,
  Funnel,
  Store,
  PersonStanding,
  ArrowRightLeft,
  Bike,
} from 'lucide-react';
import React, { useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const PageNavbar = ({ onMobileFilterClick }) => {
  const [open, setOpen] = React.useState(false);
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    setSearchQuery,
    searchQuery,
    getTotalCartItems,
    user,
    isAuthenticated,
    logout,
    activeRole,
    availableRoles,
    switchRole,
  } = useAppContext();

  // Check if we're on cart or my-orders or my-impact or notifications page
  const hideSearch =
    location.pathname === '/cart' ||
    location.pathname === '/my-orders' ||
    location.pathname === '/my-impact' ||
    location.pathname === '/notifications';

  useEffect(() => {
    // Only navigate to shop if we're not already on a shop-related page
    if (searchQuery.length > 0 && !window.location.pathname.startsWith('/shop')) {
      navigate('/shop');
    }
  }, [searchQuery]);

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-6 md:px-16 lg:px-24 xl:px-32 py-4 border-b transition-all bg-white shadow-sm"
        style={{ borderColor: '#E5E5E5' }}
      >
        <NavLink to="/" onClick={() => setOpen(false)}>
          <img src={assets.wordmarklogo} alt="ChopNow" className="h-9" />
        </NavLink>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8">
          <NavLink
            to="/shop"
            className="text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-textColor)' }}
          >
            Shop
          </NavLink>
          <NavLink
            to="/my-orders"
            className="text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-textColor)' }}
          >
            My orders
          </NavLink>
          <NavLink
            to="/my-impact"
            className="text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ color: 'var(--color-textColor)' }}
          >
            Impact
          </NavLink>

          {!hideSearch && (
            <div
              className="hidden lg:flex items-center text-sm gap-2 px-3 py-1.5 rounded-full"
              style={{ border: '1px solid var(--color-moringa-muted)', backgroundColor: 'white' }}
            >
              <input
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent outline-none text-sm"
                style={{ color: 'var(--color-textColor)' }}
                type="text"
                placeholder="Search products"
              />
              <Search className="w-4 h-4" style={{ color: 'var(--color-moringa-muted)' }} />
            </div>
          )}

          <div
            onClick={() => navigate('/cart')}
            className="relative cursor-pointer hover:opacity-70 transition-opacity"
          >
            <ShoppingCart className="w-5 h-5" style={{ color: 'var(--color-textColor)' }} />
            {getTotalCartItems() > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 text-[10px] text-white w-4 h-4 rounded-full flex items-center justify-center font-semibold"
                style={{ backgroundColor: 'var(--color-solid)' }}
              >
                {getTotalCartItems()}
              </span>
            )}
          </div>

          <div
            onClick={() => navigate('/notifications')}
            className="relative cursor-pointer hover:opacity-70 transition-opacity"
          >
            <Bell className="w-5 h-5" style={{ color: 'var(--color-textColor)' }} />
            <span
              className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
              style={{ backgroundColor: 'var(--color-solidOne)' }}
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center justify-center w-9 h-9 rounded-full hover:opacity-80 transition-opacity cursor-pointer"
              style={{ backgroundColor: 'var(--color-solid)' }}
            >
              <User className="w-5 h-5 text-white" />
            </button>

            {showProfileMenu && (
              <div
                className="absolute right-0 top-12 w-48 rounded-lg shadow-lg py-2 z-50"
                style={{ backgroundColor: 'white', border: '1px solid #E5E5E5' }}
              >
                {isAuthenticated && user ? (
                  <>
                    <div className="px-4 py-2 border-b" style={{ borderColor: '#E5E5E5' }}>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: 'var(--color-textColor)' }}
                      >
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-moringa-muted)' }}>
                        {user.email}
                      </p>
                    </div>

                    {/* Role Switcher - Only show if user has multiple roles */}
                    {availableRoles && availableRoles.length > 1 && (
                      <div className="px-4 py-2 border-b" style={{ borderColor: '#E5E5E5' }}>
                        <p
                          className="text-xs font-medium mb-2"
                          style={{ color: 'var(--color-moringa-muted)' }}
                        >
                          Switch Mode
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {availableRoles.includes('consumer') && (
                            <button
                              onClick={async () => {
                                if (activeRole !== 'consumer') {
                                  await switchRole('consumer');
                                  setShowProfileMenu(false);
                                  navigate('/shop');
                                }
                              }}
                              className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                                activeRole === 'consumer'
                                  ? 'text-white'
                                  : 'bg-gray-100 hover:bg-gray-200'
                              }`}
                              style={{
                                backgroundColor:
                                  activeRole === 'consumer' ? 'var(--color-solid)' : undefined,
                                color:
                                  activeRole === 'consumer' ? 'white' : 'var(--color-textColor)',
                              }}
                            >
                              <PersonStanding className="w-3.5 h-3.5" />
                              Buyer Mode
                            </button>
                          )}
                          {availableRoles.includes('business_owner') && (
                            <button
                              onClick={async () => {
                                if (activeRole !== 'business_owner') {
                                  await switchRole('business_owner');
                                  setShowProfileMenu(false);
                                  navigate('/dashboard');
                                }
                              }}
                              className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                                activeRole === 'business_owner'
                                  ? 'text-white'
                                  : 'bg-gray-100 hover:bg-gray-200'
                              }`}
                              style={{
                                backgroundColor:
                                  activeRole === 'business_owner'
                                    ? 'var(--color-solid)'
                                    : undefined,
                                color:
                                  activeRole === 'business_owner'
                                    ? 'white'
                                    : 'var(--color-textColor)',
                              }}
                            >
                              <Store className="w-3.5 h-3.5" />
                              Business Mode
                            </button>
                          )}
                          {availableRoles.includes('rider') && (
                            <button
                              onClick={async () => {
                                if (activeRole !== 'rider') {
                                  await switchRole('rider');
                                  setShowProfileMenu(false);
                                  navigate('/rider-dashboard');
                                }
                              }}
                              className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                                activeRole === 'rider'
                                  ? 'text-white'
                                  : 'bg-gray-100 hover:bg-gray-200'
                              }`}
                              style={{
                                backgroundColor:
                                  activeRole === 'rider' ? 'var(--color-solid)' : undefined,
                                color: activeRole === 'rider' ? 'white' : 'var(--color-textColor)',
                              }}
                            >
                              <Bike className="w-3.5 h-3.5" />
                              Rider Mode
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    <NavLink
                      to="/my-profile"
                      onClick={() => setShowProfileMenu(false)}
                      className="block px-4 py-2 text-sm hover:bg-gray-50 transition"
                      style={{ color: 'var(--color-textColor)' }}
                    >
                      My Profile
                    </NavLink>
                    <button
                      onClick={() => {
                        logout();
                        setShowProfileMenu(false);
                        navigate('/login');
                      }}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition cursor-pointer"
                      style={{ color: 'var(--color-solidOne)' }}
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <NavLink
                      to="/login"
                      onClick={() => setShowProfileMenu(false)}
                      className="block px-4 py-2 text-sm hover:bg-gray-50 transition"
                      style={{ color: 'var(--color-textColor)' }}
                    >
                      Login
                    </NavLink>
                    <NavLink
                      to="/signup"
                      onClick={() => setShowProfileMenu(false)}
                      className="block px-4 py-2 text-sm hover:bg-gray-50 transition"
                      style={{ color: 'var(--color-solid)' }}
                    >
                      Sign Up
                    </NavLink>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Icons */}
        <div className="md:hidden flex items-center gap-4">
          <div onClick={() => navigate('/cart')} className="relative cursor-pointer">
            <ShoppingCart className="w-5 h-5" style={{ color: 'var(--color-textColor)' }} />
            {getTotalCartItems() > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 text-[10px] text-white w-4 h-4 rounded-full flex items-center justify-center font-semibold"
                style={{ backgroundColor: 'var(--color-solid)' }}
              >
                {getTotalCartItems()}
              </span>
            )}
          </div>

          <button
            className="flex items-center justify-center w-8 h-8 rounded-full"
            style={{ backgroundColor: 'var(--color-solid)' }}
          >
            <User className="w-4 h-4 text-white" />
          </button>

          <button onClick={() => setOpen(!open)} aria-label="Menu" className="p-0">
            {open ? (
              <X className="w-6 h-6" style={{ color: 'var(--color-textColor)' }} />
            ) : (
              <svg
                width="21"
                height="15"
                viewBox="0 0 21 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="21" height="1.5" rx=".75" fill="#426287" />
                <rect x="8" y="6" width="13" height="1.5" rx=".75" fill="#426287" />
                <rect x="6" y="13" width="15" height="1.5" rx=".75" fill="#426287" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Search Bar - Below Navbar */}
      {!hideSearch && (
        <div className="md:hidden px-6 py-3 bg-white border-b" style={{ borderColor: '#E5E5E5' }}>
          <div
            className="flex items-center text-sm gap-2 px-3 py-2 rounded-full w-full"
            style={{ border: '1px solid var(--color-moringa-muted)' }}
          >
            <Search className="w-4 h-4" style={{ color: 'var(--color-moringa-muted)' }} />
            <input
              onChange={(e) => setSearchQuery(e.target.value)}
              value={searchQuery}
              className="w-full bg-transparent outline-none text-sm"
              style={{ color: 'var(--color-textColor)' }}
              type="text"
              placeholder="Search products"
            />
            {onMobileFilterClick && (
              <button
                onClick={onMobileFilterClick}
                className="p-1 hover:opacity-70 transition-opacity"
                aria-label="Filter"
              >
                <Funnel className="w-4 h-4" style={{ color: 'var(--color-moringa-muted)' }} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Dark Overlay - More Transparent */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile Menu - Slide from right */}
      <div
        className={`fixed top-0 right-0 h-full w-1/2 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 md:hidden ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full py-6 px-5 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => setOpen(false)} aria-label="Close Menu">
              <X className="w-6 h-6" style={{ color: 'var(--color-textColor)' }} />
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <NavLink
              to="/shop"
              onClick={() => setOpen(false)}
              className="text-sm font-medium py-2"
              style={{ color: 'var(--color-textColor)' }}
            >
              Shop
            </NavLink>
            <NavLink
              to="/my-orders"
              onClick={() => setOpen(false)}
              className="text-sm font-medium py-2"
              style={{ color: 'var(--color-textColor)' }}
            >
              My Orders
            </NavLink>
            <NavLink
              to="/my-impact"
              onClick={() => setOpen(false)}
              className="text-sm font-medium py-2"
              style={{ color: 'var(--color-textColor)' }}
            >
              Impact
            </NavLink>

            <div
              onClick={() => navigate('/notifications')}
              className="flex items-center gap-6 pt-6 border-t mt-4"
              style={{ borderColor: '#E5E5E5' }}
            >
              <div className="relative cursor-pointer">
                <Bell className="w-5 h-5" style={{ color: 'var(--color-textColor)' }} />
                <span
                  className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                  style={{ backgroundColor: 'var(--color-solidOne)' }}
                />
              </div>
              <span className="text-xs" style={{ color: 'var(--color-moringa-muted)' }}>
                Notifications
              </span>
            </div>

            {/* Mobile Role Switcher - Only show if user has multiple roles */}
            {isAuthenticated && availableRoles && availableRoles.length > 1 && (
              <div className="pt-6 border-t mt-4" style={{ borderColor: '#E5E5E5' }}>
                <p
                  className="text-xs font-medium mb-3"
                  style={{ color: 'var(--color-moringa-muted)' }}
                >
                  Switch Mode
                </p>
                <div className="flex flex-col gap-2">
                  {availableRoles.includes('consumer') && (
                    <button
                      onClick={async () => {
                        if (activeRole !== 'consumer') {
                          await switchRole('consumer');
                          setOpen(false);
                          navigate('/shop');
                        }
                      }}
                      className={`flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                        activeRole === 'consumer' ? 'text-white' : 'bg-gray-100'
                      }`}
                      style={{
                        backgroundColor:
                          activeRole === 'consumer' ? 'var(--color-solid)' : undefined,
                        color: activeRole === 'consumer' ? 'white' : 'var(--color-textColor)',
                      }}
                    >
                      <PersonStanding className="w-4 h-4" />
                      Buyer Mode
                    </button>
                  )}
                  {availableRoles.includes('business_owner') && (
                    <button
                      onClick={async () => {
                        if (activeRole !== 'business_owner') {
                          await switchRole('business_owner');
                          setOpen(false);
                          navigate('/dashboard');
                        }
                      }}
                      className={`flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                        activeRole === 'business_owner' ? 'text-white' : 'bg-gray-100'
                      }`}
                      style={{
                        backgroundColor:
                          activeRole === 'business_owner' ? 'var(--color-solid)' : undefined,
                        color: activeRole === 'business_owner' ? 'white' : 'var(--color-textColor)',
                      }}
                    >
                      <Store className="w-4 h-4" />
                      Business Mode
                    </button>
                  )}
                  {availableRoles.includes('rider') && (
                    <button
                      onClick={async () => {
                        if (activeRole !== 'rider') {
                          await switchRole('rider');
                          setOpen(false);
                          navigate('/rider-dashboard');
                        }
                      }}
                      className={`flex items-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                        activeRole === 'rider' ? 'text-white' : 'bg-gray-100'
                      }`}
                      style={{
                        backgroundColor: activeRole === 'rider' ? 'var(--color-solid)' : undefined,
                        color: activeRole === 'rider' ? 'white' : 'var(--color-textColor)',
                      }}
                    >
                      <Bike className="w-4 h-4" />
                      Rider Mode
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Mobile Auth Links */}
            {isAuthenticated ? (
              <div className="pt-6 border-t mt-4" style={{ borderColor: '#E5E5E5' }}>
                <NavLink
                  to="/my-profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 text-sm font-medium py-2"
                  style={{ color: 'var(--color-textColor)' }}
                >
                  <User className="w-4 h-4" />
                  My Profile
                </NavLink>
                <button
                  onClick={() => {
                    logout();
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 text-sm font-medium py-2 w-full"
                  style={{ color: 'var(--color-solidOne)' }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="pt-6 border-t mt-4" style={{ borderColor: '#E5E5E5' }}>
                <NavLink
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="block text-sm font-medium py-2"
                  style={{ color: 'var(--color-textColor)' }}
                >
                  Login
                </NavLink>
                <NavLink
                  to="/signup"
                  onClick={() => setOpen(false)}
                  className="block text-sm font-medium py-2"
                  style={{ color: 'var(--color-solid)' }}
                >
                  Sign Up
                </NavLink>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PageNavbar;
