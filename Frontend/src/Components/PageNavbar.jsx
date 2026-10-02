import {
  Bell,
  Search,
  ShoppingCart,
  User,
  X,
  Menu,
  Funnel,
  Store,
  PersonStanding,
  Bike,
} from 'lucide-react';
import React, { useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Logo } from './brand/Kit';

/*
 * App header (LayersbyJ tile revamp). Same behaviour as before: search feeds
 * AppContext.searchQuery, cart badge, notifications, profile menu with role
 * switching. Only the presentation changed. Height stays ~72px so pages that
 * offset for the fixed bar keep working.
 */

const ROLES = [
  { key: 'consumer', label: 'Buyer mode', Icon: PersonStanding, to: '/shop' },
  { key: 'business_owner', label: 'Business mode', Icon: Store, to: '/dashboard' },
  { key: 'rider', label: 'Rider mode', Icon: Bike, to: '/rider-dashboard' },
];

const NAV = [
  { to: '/shop', label: 'Shop' },
  { to: '/my-orders', label: 'My orders' },
  { to: '/my-impact', label: 'Impact' },
];

const navCls = ({ isActive }) =>
  `eyebrow text-[13px] py-2 border-b-2 transition-colors ${
    isActive ? 'text-yellow border-yellow' : 'text-fufu border-transparent hover:text-yellow'
  }`;

const IconBtn = ({ onClick, label, children, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className={`relative w-11 h-11 flex items-center justify-center text-fufu hover:bg-moringa-2 transition-colors ${className}`}
  >
    {children}
  </button>
);

const CartBadge = ({ count }) =>
  count > 0 ? (
    <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-yellow text-moringa text-[10px] font-bold flex items-center justify-center">
      {count}
    </span>
  ) : null;

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

  const hideSearch =
    location.pathname === '/cart' ||
    location.pathname === '/my-orders' ||
    location.pathname === '/my-impact' ||
    location.pathname === '/notifications';

  useEffect(() => {
    if (searchQuery.length > 0 && !window.location.pathname.startsWith('/shop')) {
      navigate('/shop');
    }
  }, [searchQuery]);

  const cartCount = getTotalCartItems();
  const roles = ROLES.filter((r) => availableRoles?.includes(r.key));

  const onSwitch = async (role, close) => {
    if (activeRole !== role.key) {
      await switchRole(role.key);
      close(false);
      navigate(role.to);
    }
  };

  const renderRoleSwitcher = (close) =>
    roles.length > 1 ? (
      <div className="px-4 py-3 border-b border-hairline">
        <p className="eyebrow text-moringa-muted mb-2">Switch mode</p>
        <div className="flex flex-col gap-1.5">
          {roles.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => onSwitch(r, close)}
              className={`w-full h-10 flex items-center gap-2 px-3 text-sm font-semibold transition-colors ${
                activeRole === r.key
                  ? 'bg-moringa text-yellow'
                  : 'bg-fufu-dim text-moringa hover:bg-mint'
              }`}
            >
              <r.Icon className="w-4 h-4" aria-hidden="true" />
              {r.label}
            </button>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-30 bg-moringa">
        <div className="mx-auto max-w-[1440px] h-[72px] px-4 sm:px-8 lg:px-12 flex items-center justify-between gap-4">
          <NavLink
            to="/"
            onClick={() => setOpen(false)}
            aria-label="ChopNow home"
            className="shrink-0"
          >
            <Logo tone="dark" size="md" />
          </NavLink>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={navCls}>
                {n.label}
              </NavLink>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-1">
            {!hideSearch && (
              <label className="hidden lg:flex items-center gap-2 h-11 w-[260px] px-3 mr-2 bg-fufu text-moringa focus-within:outline-2 focus-within:outline-yellow">
                <Search className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="sr-only">Search products</span>
                <input
                  onChange={(e) => setSearchQuery(e.target.value)}
                  value={searchQuery}
                  className="w-full bg-transparent outline-none text-sm placeholder:text-moringa-muted"
                  type="text"
                  placeholder="Search food near you"
                />
              </label>
            )}
            <IconBtn onClick={() => navigate('/cart')} label={`Cart, ${cartCount} items`}>
              <ShoppingCart className="w-5 h-5" />
              <CartBadge count={cartCount} />
            </IconBtn>
            <IconBtn onClick={() => navigate('/notifications')} label="Notifications">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-pepper" />
            </IconBtn>

            <div className="relative ml-1">
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                aria-label="Account menu"
                aria-expanded={showProfileMenu}
                className="w-11 h-11 flex items-center justify-center bg-yellow text-moringa hover:bg-yellow-dark transition-colors cursor-pointer"
              >
                <User className="w-5 h-5" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 top-[52px] w-60 bg-white border border-char/15 z-50">
                  {isAuthenticated && user ? (
                    <>
                      <div className="px-4 py-3 border-b border-hairline bg-fufu">
                        <p className="text-sm font-bold text-moringa truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-moringa-muted truncate">{user.email}</p>
                      </div>
                      {renderRoleSwitcher(setShowProfileMenu)}
                      <NavLink
                        to="/my-profile"
                        onClick={() => setShowProfileMenu(false)}
                        className="block px-4 py-3 text-sm font-semibold text-moringa hover:bg-fufu"
                      >
                        My profile
                      </NavLink>
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setShowProfileMenu(false);
                          navigate('/login');
                        }}
                        className="block w-full text-left px-4 py-3 text-sm font-semibold text-clay hover:bg-fufu cursor-pointer border-t border-hairline"
                      >
                        Log out
                      </button>
                    </>
                  ) : (
                    <>
                      <NavLink
                        to="/login"
                        onClick={() => setShowProfileMenu(false)}
                        className="block px-4 py-3 text-sm font-semibold text-moringa hover:bg-fufu"
                      >
                        Log in
                      </NavLink>
                      <NavLink
                        to="/signup"
                        onClick={() => setShowProfileMenu(false)}
                        className="block px-4 py-3 text-sm font-semibold bg-moringa text-fufu hover:bg-moringa-dark"
                      >
                        Create an account
                      </NavLink>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mobile */}
          <div className="md:hidden flex items-center gap-1">
            <IconBtn onClick={() => navigate('/cart')} label={`Cart, ${cartCount} items`}>
              <ShoppingCart className="w-5 h-5" />
              <CartBadge count={cartCount} />
            </IconBtn>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              className="w-11 h-11 bg-yellow text-moringa flex items-center justify-center"
            >
              {open ? (
                <X className="w-5 h-5" strokeWidth={2.5} />
              ) : (
                <Menu className="w-5 h-5" strokeWidth={2.5} />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile search, below the bar */}
      {!hideSearch && (
        <div className="md:hidden px-4 py-3 bg-moringa border-t border-moringa-2">
          <div className="flex items-center gap-2 h-11 px-3 bg-fufu text-moringa">
            <Search className="w-4 h-4 shrink-0" aria-hidden="true" />
            <input
              onChange={(e) => setSearchQuery(e.target.value)}
              value={searchQuery}
              aria-label="Search products"
              className="w-full bg-transparent outline-none text-sm placeholder:text-moringa-muted"
              type="text"
              placeholder="Search food near you"
            />
            {onMobileFilterClick && (
              <button
                type="button"
                onClick={onMobileFilterClick}
                className="w-9 h-9 -mr-1.5 flex items-center justify-center bg-moringa text-yellow"
                aria-label="Filter"
              >
                <Funnel className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile menu: full screen, moringa */}
      {open && (
        <div className="md:hidden fixed inset-x-0 top-[72px] bottom-0 z-50 bg-moringa text-fufu overflow-y-auto flex flex-col">
          <nav aria-label="Mobile" className="flex flex-col border-t border-moringa-2">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `display text-[44px] px-4 py-4 border-b border-moringa-2 ${isActive ? 'text-yellow' : 'text-fufu'}`
                }
              >
                {n.label}
              </NavLink>
            ))}
            <NavLink
              to="/notifications"
              onClick={() => setOpen(false)}
              className="display text-[44px] px-4 py-4 border-b border-moringa-2 text-fufu flex items-center gap-3"
            >
              Notifications <span className="w-2.5 h-2.5 rounded-full bg-pepper" />
            </NavLink>
          </nav>

          {isAuthenticated && roles.length > 1 && (
            <div className="px-4 py-5 border-b border-moringa-2">
              <p className="eyebrow text-fufu/80 mb-3">Switch mode</p>
              <div className="grid gap-2">
                {roles.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => onSwitch(r, setOpen)}
                    className={`h-12 flex items-center gap-2 px-3 text-sm font-semibold ${
                      activeRole === r.key ? 'bg-yellow text-moringa' : 'bg-moringa-2 text-fufu'
                    }`}
                  >
                    <r.Icon className="w-4 h-4" aria-hidden="true" />
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-auto p-4 grid grid-cols-2 gap-3">
            {isAuthenticated ? (
              <>
                <NavLink
                  to="/my-profile"
                  onClick={() => setOpen(false)}
                  className="h-12 flex items-center justify-center gap-2 border-2 border-fufu text-fufu font-semibold"
                >
                  <User className="w-4 h-4" /> My profile
                </NavLink>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setOpen(false);
                  }}
                  className="h-12 bg-fufu text-clay font-semibold"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="h-12 flex items-center justify-center border-2 border-fufu text-fufu font-semibold"
                >
                  Log in
                </NavLink>
                <NavLink
                  to="/signup"
                  onClick={() => setOpen(false)}
                  className="h-12 flex items-center justify-center bg-yellow text-moringa font-semibold"
                >
                  Sign up
                </NavLink>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default PageNavbar;
