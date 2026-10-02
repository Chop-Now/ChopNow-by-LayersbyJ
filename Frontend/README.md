# ChopNow Frontend Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)
5. [Admin Dashboard Architecture](#admin-dashboard-architecture)
6. [Admin Dashboard Pages](#admin-dashboard-pages)
7. [Public Pages](#public-pages)
8. [Components](#components)
9. [Context & State Management](#context--state-management)
10. [Styling & Theming](#styling--theming)

---

## Project Overview

ChopNow is a sustainable food marketplace platform that connects consumers with local vendors selling surplus food at discounted prices. The platform helps reduce food waste while providing affordable options to consumers. The frontend is built with React and Vite, featuring both public-facing pages and a comprehensive admin dashboard with advanced analytics, search functionality, and dual admin modes.

**Key Features:**

- Public marketplace with product browsing and purchasing
- Dual admin dashboard system (Shop Admin & Website Admin)
- Dark mode support throughout the application
- Comprehensive analytics with interactive charts
- Advanced search with deep keyword matching
- Global search functionality across all admin pages
- Real-time data visualization with Recharts
- User profile and notification management
- Product listing management with search, filtering, and pagination
- Complete settings system with multiple tabs
- Responsive design with Tailwind CSS

---

## Tech Stack

### Core Technologies

- **React 18+** - Frontend framework
- **Vite** - Build tool and dev server
- **Tailwind CSS 4.x** - Utility-first CSS framework
- **Lucide React** - Icon library (extensive icon set)
- **Recharts** - Data visualization library

### Key Dependencies

```json
{
  "react": "^18.x",
  "react-dom": "^18.x",
  "lucide-react": "latest",
  "recharts": "latest",
  "tailwindcss": "^4.x"
}
```

---

## Project Structure

```
Frontend/
├── public/                          # Static assets
├── src/
│   ├── admin/                       # Admin dashboard (main focus)
│   │   ├── Dashboard.jsx           # Main admin container with routing
│   │   ├── context/
│   │   │   └── AdminModeContext.jsx # Admin mode state management (shop/website)
│   │   ├── components/
│   │   │   ├── ConfirmationModal.jsx # Reusable confirmation modal
│   │   │   ├── layout/
│   │   │   │   ├── Header.jsx      # Top navigation with search, profile, notifications
│   │   │   │   └── Sidebar.jsx     # Left navigation menu with collapsible support
│   │   │   └── Content/
│   │   │       ├── Content.jsx     # Dashboard overview content
│   │   │       ├── StatsGrid.jsx   # Statistics cards (dynamic based on admin mode)
│   │   │       ├── ChartSection.jsx # Charts container
│   │   │       ├── RevenueChart.jsx # Revenue bar chart
│   │   │       ├── SalesChart.jsx   # Sales line chart
│   │   │       ├── OrderTrendsChart.jsx # Order trends with period toggle
│   │   │       ├── ActivityFeed.jsx # Recent activity timeline (scrollable)
│   │   │       ├── TableSection.jsx # Recent orders table (Shop Admin)
│   │   │       └── DisputesTable.jsx # Recent disputes table (Website Admin)
│   │   └── pages/
│   │       ├── Analytics.jsx       # Analytics system with 4 sub-pages ✅
│   │       │   ├── Overview        # Analytics overview with key metrics
│   │       │   ├── Reports         # Detailed reports and exports
│   │       │   ├── Insights        # Business insights and recommendations
│   │       │   └── Impact          # Environmental impact tracking
│   │       ├── Users.jsx           # User management (placeholder)
│   │       ├── Orders.jsx          # Orders management (placeholder)
│   │       ├── Listings.jsx        # Product listings management ✅
│   │       ├── Vendors.jsx         # Vendor management (placeholder)
│   │       ├── Disputes.jsx        # Dispute resolution ✅
│   │       │   ├── RefundRequests  # Refund management
│   │       │   └── Complaints      # Customer complaints with sidebar details
│   │       ├── Payouts.jsx         # Payout management ✅
│   │       │   ├── ShopAdminPayouts # Vendor payout view
│   │       │   └── WebsiteAdminPayouts # Platform payout processing
│   │       ├── Settings.jsx        # Settings system ✅
│   │       │   ├── Profile         # Profile settings tab
│   │       │   ├── Business        # Business details tab (Shop Admin only)
│   │       │   └── Security        # Security settings tab (2FA, password, sessions)
│   │       └── ComingSoon.jsx      # Placeholder component for unimplemented pages
│   │
│   ├── Pages/                       # Public pages
│   │   ├── Home.jsx                # Landing page
│   │   ├── Shop.jsx                # Product marketplace
│   │   ├── ProductDetails.jsx      # Product detail view
│   │   ├── Cart.jsx                # Shopping cart
│   │   ├── Login.jsx               # User login
│   │   ├── SignUp.jsx              # User registration
│   │   ├── MyProfile.jsx           # User profile
│   │   ├── MyOrders.jsx            # Order history
│   │   ├── MyImpact.jsx            # Environmental impact tracking
│   │   ├── CategoryPage.jsx        # Category browsing
│   │   ├── ContactUs.jsx           # Contact page
│   │   ├── FAQ.jsx                 # FAQ page
│   │   ├── BusinessVerification.jsx # Vendor verification
│   │   ├── PendingReview.jsx       # Review pending page
│   │   └── Notification.jsx        # Notifications page
│   │
│   ├── Components/                  # Shared components
│   │   ├── Navbar.jsx              # Main navigation
│   │   ├── PageNavbar.jsx          # Page-specific navigation
│   │   ├── Footer.jsx              # Footer component
│   │   ├── Header.jsx              # Hero header
│   │   ├── Hero.jsx                # Hero section
│   │   ├── Products.jsx            # Product grid
│   │   ├── ProductCard.jsx         # Product card
│   │   ├── Categories.jsx          # Category grid
│   │   ├── ShopSidebar.jsx         # Shop filters
│   │   ├── Breadcrumb.jsx          # Breadcrumb navigation
│   │   ├── AboutUs.jsx             # About section
│   │   ├── HowItWorks.jsx          # How it works section
│   │   ├── Testimonials.jsx        # Customer testimonials
│   │   ├── Advisors.jsx            # Advisors section
│   │   ├── Milestones.jsx          # Company milestones
│   │   ├── Apps.jsx                # App download section
│   │   ├── NotFound.jsx            # 404 page
│   │   ├── maps/
│   │   │   ├── LocationPicker.jsx  # Location selection component
│   │   │   └── useGeolocation.js   # Geolocation custom hook
│   │   ├── ui/
│   │   │   ├── button.jsx          # Reusable button component
│   │   │   └── animated-testimonials.jsx # Animated testimonials
│   │   └── animate-ui/             # Animation components
│   │       └── community/
│   │           └── flip-card.jsx   # Flip card animation
│   │
│   ├── assets/
│   │   └── assets.js               # Product data, images, and dummy data
│   │
│   ├── context/
│   │   └── AppContext.jsx          # Global app context
│   │
│   ├── services/
│   │   └── geocoding.js            # Geocoding utilities
│   │
│   ├── lib/
│   │   └── utils.js                # Utility functions (cn helper)
│   │
│   ├── App.jsx                     # Main app component
│   ├── main.jsx                    # App entry point
│   ├── App.css                     # App-specific styles
│   └── index.css                   # Global styles and Tailwind directives
│
├── components.json                 # shadcn/ui component config
├── tailwind.config.js              # Tailwind configuration
├── vite.config.js                  # Vite configuration
├── jsconfig.json                   # JavaScript config for path aliases
├── package.json                    # Dependencies
└── README.md                       # This file
```

---

## Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn
- Basic knowledge of React and Tailwind CSS

### Installation

1. **Navigate to Frontend directory**

   ```bash
   cd Frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Run development server**

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`

4. **Build for production**

   ```bash
   npm run build
   ```

5. **Preview production build**
   ```bash
   npm run preview
   ```

---

## Admin Dashboard Architecture

The admin dashboard is the core feature of this application, providing a comprehensive management interface for the ChopNow platform. It features a **dual admin system** with advanced search, analytics, and responsive design.

### Dashboard Entry Point

**Location:** `src/admin/Dashboard.jsx`

This is the main container for the entire admin dashboard. It handles:

- Page routing logic via `renderPage()` switch statement
- Admin mode context provider wrapper
- Layout composition (Header + Sidebar + Content)
- Settings tab navigation via `handleNavigateToSettings()`
- Page change handling via `handlePageChange()`

**Key State:**

```javascript
const [sideBarCollapsed, setSideBarCollapsed] = useState(false);
const [currentPage, setCurrentPage] = useState('dashboard');
const [settingsTab, setSettingsTab] = useState('profile');
```

### Dual Admin System

The platform supports two types of admin accounts with distinct capabilities:

#### 1. **Shop Admin** (Individual Vendor)

**Access To:**

- Dashboard (overview with stats, charts, recent orders, activity feed)
- Analytics (Overview, Reports, Insights, Impact)
- Orders (All, Pending, Completed, Deliveries)
- Listings (All Listings, New Listing)
- Payouts (View earnings, request payouts)
- Settings (Profile, Business Details, Security)
- View Storefront button (opens public shop page)

**Restricted From:**

- Users management
- Vendor management
- Disputes management
- Platform-wide statistics

#### 2. **Website Admin** (Platform Administrator)

**Access To:**

- Dashboard (overview with platform stats, charts, disputes table, activity feed)
- Analytics (Overview, Reports, Insights, Impact) - Platform-wide data
- Users (All Users, Roles & Permissions, Activity)
- Orders (All Orders, Pending, Completed, Deliveries) - All vendors
- Listings (All Listings across vendors)
- Vendors (All Vendors, Vendor Approval)
- Disputes (Refund Requests, Customer Complaints)
- Payouts (Release payouts to vendors)
- Settings (Profile, Security)

**Key Difference:** Website Admin sees aggregated platform data and has vendor/dispute management capabilities

### Admin Mode Toggle

**Location:** `src/admin/components/layout/Header.jsx`

Located in the header's right section, users can switch between admin modes:

- **Shop Admin Icon:** Store icon (Lucide `Store`)
- **Website Admin Icon:** Building2 icon (Lucide `Building2`)
- Toggle changes global state via `AdminModeContext`
- Sidebar menu dynamically updates based on mode
- Dashboard content, stats, and analytics adapt to mode

### Global Search System

**Location:** `src/admin/components/layout/Header.jsx` (Search functionality)

**Features:**

- Press search icon or click search input to open modal
- Dark overlay (`z-9998`) with centered search modal (`z-9999`)
- Real-time search as you type
- Searches through: page names, paths, and deep keywords
- Shows icon, label, and path for each result
- Click result to navigate directly to that page/section
- Supports both navigation and actions (dark mode, logout, etc.)

**Search Items Include:**

- All dashboard pages and sub-pages
- Settings tabs (navigates to specific tab)
- Analytics sections
- Order management pages
- Profile menu actions
- Deep keywords like: "two factor authentication" → Security Settings, "bank account" → Payouts, etc.

**Implementation:**

- `shopAdminSearchItems` array with comprehensive keywords
- `websiteAdminSearchItems` array (different from shop admin)
- `handleSearchChange()` filters by label, path, and keywords
- Click handler detects `tab` property for settings navigation
- Uses `onNavigateToSettings()` for tab-specific navigation

### Admin Mode Context

**Location:** `src/admin/context/AdminModeContext.jsx`

```javascript
// Context provides:
{
  adminMode: 'shop' | 'website',
  toggleAdminMode: () => void
}

// Usage in components:
const { adminMode, toggleAdminMode } = useAdminMode()
```

**Consumed by:**

- `Sidebar.jsx` - Different menu items and structure
- `Header.jsx` - Toggle button and search items
- `StatsGrid.jsx` - Different statistics based on mode
- `Content.jsx` - Shows TableSection (shop) or DisputesTable (website)
- `Analytics.jsx` - Different analytics data and metrics
- `Settings.jsx` - Shows Business tab only for Shop Admin

---

## Admin Dashboard Pages

### 1. Dashboard Overview (Default Page)

**Location:** `src/admin/components/Content/Content.jsx`  
**Route:** Default page when entering admin dashboard  
**Status:** ✅ Fully Implemented

**Components:**

1. **StatsGrid** (`StatsGrid.jsx`)
   - **Shop Admin Stats:**
     - Total Revenue (with 12.5% growth indicator)
     - Total Orders (with 8.2% growth)
     - CO2e Saved (environmental impact)
     - Total Reviews (with 15.3% growth)
   - **Website Admin Stats:**
     - Total Revenue (platform-wide)
     - Total Orders (all vendors)
     - Total Vendors (with active count)
     - Total Users (registered users)
   - Icons: TrendingUp, ShoppingCart, Leaf, Star, Store, Users
   - Each card shows trend percentage with arrow indicator

2. **ChartSection** (`ChartSection.jsx`)
   - **RevenueChart** - Bar chart showing monthly revenue (Jan-Dec)
   - **SalesChart** - Line chart showing sales trend
   - **OrderTrendsChart** - Line chart with period toggle:
     - Toggle buttons: Monthly, Quarterly, Annually
     - Shows order volume over time
     - Active toggle has green background
   - All charts use Recharts library with responsive containers
   - Tooltip on hover for detailed data

3. **ActivityFeed** (`ActivityFeed.jsx`)
   - Timeline of recent system activities
   - Matches height of adjacent table (flex layout)
   - Scrollable when many activities
   - Activity types: User registration, New orders, Deliveries, Profile updates
   - Each activity shows icon, title, description, timestamp
   - Color-coded icons: blue (user), green (order), purple (delivery), yellow (update)

4. **Dynamic Table Section:**
   - **Shop Admin:** `TableSection.jsx` - Recent Orders
     - Shows last 5 orders with: Order ID, Product (image + name), Category, Price, Status, Actions
     - Hover effects on rows
     - Filter and "See All" buttons in header
   - **Website Admin:** `DisputesTable.jsx` - Recent Disputes
     - Shows: Dispute ID, Customer, Vendor, Type, Reason, Amount, Date, Status, Actions
     - Status badges: Pending (yellow), Under Review (blue), Resolved (green)
     - View Details button for each dispute

**Layout:**

- Full-width stats grid (4 columns on large screens)
- Chart section (3 charts side by side)
- Bottom grid: Table (2/3 width) + Activity Feed (1/3 width)
- Both table and activity feed match heights with internal scrolling

---

### 2. Analytics System

**Location:** `src/admin/pages/Analytics.jsx`  
**Route:** Navigate to Analytics from sidebar  
**Status:** ✅ Fully Implemented (4 sub-pages)

The Analytics page has internal navigation with 4 tabs:

#### 2a. Analytics > Overview

**Component:** `ShopAdminOverview` or `WebsiteAdminOverview`

**Shop Admin View:**

- **Stats Cards:** Revenue Today, Orders, Active Listings, Fulfillment Rate
- **Revenue Chart:** Bar chart with 7-day data
- **Sales Breakdown:** Pie chart by category (Meals, Produce, Bakery, etc.)
- **Recent Orders Table:** Last 5 orders with quick view

**Website Admin View:**

- **Platform Stats:** Total Revenue, Total Orders, CO2 Saved, Active Vendors
- **Vendor Leaderboard:** Top 5 performing vendors with rankings
- **Revenue Chart:** Platform-wide revenue trends
- **Environmental Impact:** Meals rescued, CO2e saved, Water saved metrics

#### 2b. Analytics > Reports

**Component:** `ShopAdminReports` or `WebsiteAdminReports`

**Features:**

- **Revenue Breakdown:** Detailed revenue by time period
- **Cost Analysis:** Operational costs tracking
- **Category Performance:** Best-selling categories
- **Peak Hours Analysis:** Busiest order times
- **Order Fulfillment Metrics:** Completion rates
- **Export Options:** Download as CSV, PDF, Excel

**Shop Admin:** Individual shop data  
**Website Admin:** Platform-wide aggregated data

#### 2c. Analytics > Insights

**Component:** `ShopAdminInsights` or `WebsiteAdminInsights`

**Features:**

- **Customer Behavior Analysis:** Purchase patterns
- **Conversion Rates:** Browse to purchase conversion
- **Growth Opportunities:** Recommendations for improvement
- **Retention Metrics:** Repeat customer rates
- **Trend Analysis:** Seasonal trends and patterns

**Shop Admin Focus:** Shop-specific insights  
**Website Admin Focus:** User growth, vendor metrics, regional analysis, demographics

#### 2d. Analytics > Impact

**Component:** `ShopAdminImpact` or `WebsiteAdminImpact`

**Features:**

- **Environmental Metrics:**
  - Total meals rescued from waste
  - CO2 emissions saved (kilograms)
  - Water saved (liters)
- **Ranking System:** Compare impact with other vendors
- **Monthly Trends:** Impact over time visualization
- **Impact Score:** Overall sustainability rating

**Shop Admin:** Individual vendor impact  
**Website Admin:** Platform-wide environmental impact

**Navigation:**

- Tab navigation at top of page
- Active tab highlighted with green background
- Smooth transitions between tabs
- All tabs share consistent design system

---

### 3. Users Management

**Location:** `src/admin/pages/Users.jsx`  
**Route:** Users menu in sidebar  
**Access:** Website Admin Only  
**Status:** 🚧 Placeholder (Coming Soon)

**Intended Features:**

- User list with pagination
- Search and filter by role, status
- View user details
- Suspend/activate accounts
- Export user list

**Sub-menu Items (Website Admin):**

- All Users
- Roles & Permissions
- User Activity

**Backend Needs:**

- `GET /api/admin/users`
- `GET /api/admin/users/:id`
- `PUT /api/admin/users/:id/status`

---

### 4. Orders Management

**Location:** `src/admin/pages/Orders.jsx`  
**Route:** Orders menu in sidebar  
**Status:** 🚧 Placeholder (Coming Soon)

**Intended Features:**

- Order list with search and filters
- Order details sidebar
- Status updates
- Order timeline
- Export orders

**Sub-menu Items:**

- All Orders
- Pending Orders
- Completed Orders
- Deliveries

**Shop Admin:** Only their shop's orders  
**Website Admin:** All platform orders with vendor filter

**Backend Needs:**

- `GET /api/admin/orders`
- `GET /api/admin/orders/:id`
- `PUT /api/admin/orders/:id/status`

---

### 5. Listings Management

**Location:** `src/admin/pages/Listings.jsx`  
**Route:** Listings menu in sidebar  
**Status:** ✅ Fully Implemented

**Features:**

1. **Statistics Cards (Top Section)**
   - Total Listings
   - Active Listings
   - Inactive Listings
   - Expired Listings
   - Each with icon and count

2. **Search & Filters**
   - Search input (searches product names)
   - Status dropdown: All Status, Active, Inactive, Expired
   - Real-time filtering

3. **Bulk Actions** (appears when items selected)
   - Select All checkbox
   - Activate Selected (green button)
   - Deactivate Selected (orange button)
   - Delete Selected (red button)
   - Shows count of selected items

4. **Products Table**
   - Columns: Checkbox, Product, Category, Stock, Pickup Window, Date Created, Status, Actions
   - Product column: 10x10 image + name + price
   - Status badges: Active (green), Inactive (orange), Expired (red)
   - Actions per row:
     - Toggle switch (activate/deactivate)
     - Edit button (pencil icon)
     - Delete button (trash icon)
   - Hover effects on rows

5. **Pagination**
   - Shows 5 items per page
   - "Showing X to Y of Z listings" text
   - Previous/Next buttons
   - Numbered page buttons
   - Active page with green background

**Data Flow:**

- Uses `dummyProducts` from `assets/assets.js`
- Adds status ('active', 'inactive', 'expired') and stock
- Filters by search term and status
- Client-side pagination

**Backend Needs:**

- `GET /api/admin/listings`
- `PUT /api/admin/listings/:id/status`
- `DELETE /api/admin/listings/:id`
- `POST /api/admin/listings/bulk-action`

**Sub-menu Items:**

- All Listings (this page)
- New Listing (placeholder)

---

### 6. Vendors Management

**Location:** `src/admin/pages/Vendors.jsx`  
**Route:** Vendors menu in sidebar  
**Access:** Website Admin Only  
**Status:** 🚧 Placeholder (Coming Soon)

**Intended Features:**

- Vendor list with search
- Approve/reject applications
- Suspend/activate vendors
- View vendor performance
- Vendor details sidebar

**Sub-menu Items:**

- All Vendors
- Vendor Approval

**Backend Needs:**

- `GET /api/admin/vendors`
- `GET /api/admin/vendors/:id`
- `PUT /api/admin/vendors/:id/status`

---

### 7. Disputes Management

**Location:** `src/admin/pages/Disputes.jsx`  
**Route:** Disputes menu in sidebar  
**Access:** Website Admin Only  
**Status:** ✅ Fully Implemented

**Features:**

1. **Tab Navigation**
   - Refund Requests tab
   - Customer Complaints tab
   - Active tab highlighted with green underline

2. **Refund Requests View**
   - Currently placeholder (Coming Soon)
   - Will show refund request list
   - Status: Pending, Approved, Rejected

3. **Customer Complaints View** (Fully Implemented)
   - **Complaints List:**
     - Card-based layout
     - Priority badges: Critical (red), High (orange), Medium (yellow)
     - Shows: Order ID, customer name, incident summary, time
     - "View Details" button per complaint
   - **Details Sidebar:**
     - Opens on right side with dark overlay
     - Full height, scrollable content
     - **Sections:**
       - Header with close button
       - Order Information (ID, value, priority)
       - Customer Details (name, email, phone, status, location)
       - Vendor Details (name, phone, location)
       - Full Complaint Text
       - Images (if provided)
       - Timeline of events
       - Action Buttons: Call Customer, Message Vendor, Alert Vendor, Resolve Issue
     - Dark overlay covers viewport including bottom scroll area
     - Click overlay or X to close

**Issues Data Structure:**

```javascript
{
  id, orderId, orderValue, priority: 'critical' | 'high' | 'medium',
  type, title, incident, fullComplaint, since, reportedAt,
  customer: { name, email, phone, status, location, image },
  vendor: { name, phone, location },
  deliveryStatus, rider, images[], timeline[], actions[]
}
```

**Sub-menu Items:**

- Refund Requests (placeholder)
- Customer Complaints (implemented)

---

### 8. Payouts Management

**Location:** `src/admin/pages/Payouts.jsx`  
**Route:** Payouts menu in sidebar (Finance section)  
**Status:** ✅ Fully Implemented

**Shop Admin View** (`ShopAdminPayouts`):

**Stats Cards:**

- Available Balance
- Pending Clearance
- Total Earnings
- Next Payout Date

**Features:**

- Payment Method Setup (MTN Mobile Money, Airtel Money, Bank Transfer)
- Payout History Table:
  - Columns: Payout ID, Amount, Date, Method, Status
  - Status badges: Completed (green), Pending (yellow), Processing (blue)
- Request Payout Button
- Filter options

**Website Admin View** (`WebsiteAdminPayouts`):

**Stats Cards:**

- Total Payouts This Month
- Pending Payouts
- Completed Payouts
- Failed Payouts

**Features:**

- Pending Payouts Table:
  - Shows vendors awaiting payout
  - Columns: Vendor Name, Amount, Request Date, Payment Method, Actions
  - "Release Payout" button per vendor
- Payout History with all vendors
- Bulk payout processing
- Export payout reports

**Backend Needs:**

- `GET /api/admin/payouts`
- `POST /api/admin/payouts/request` (Shop Admin)
- `POST /api/admin/payouts/release` (Website Admin)

---

### 9. Settings System

**Location:** `src/admin/pages/Settings.jsx`  
**Route:** Settings menu in sidebar  
**Status:** ✅ Fully Implemented

**Layout:**

- Left sidebar with tab navigation
- Right content area (3/4 width)
- Tab changes content dynamically

**Tabs:**

#### 9a. Profile Settings

**Both Admin Types**

**Shop Admin Fields:**

- Business Logo upload
- Business Name
- Business Tagline
- Business Email
- Contact Person
- Contact Email
- Phone Number

**Website Admin Fields:**

- Profile Picture upload
- Name
- Email
- Phone Number

**Features:**

- Image upload with preview
- Update Profile button
- Form validation

#### 9b. Business Details

**Shop Admin Only**

**Sections:**

1. **Business Hours:**
   - Set hours for each day of week
   - "Closed" toggle for days off
   - From/To time inputs

2. **Special Hours:**
   - Add special hours for holidays
   - Date, name, hours fields
   - Add/remove special hours

3. **Business Information:**
   - Contact Phone
   - Physical Address with map picker
   - Location integration

4. **Certificates & Documents:**
   - Upload certificates (Business License, Health Certificate, Tax Registration)
   - View uploaded documents
   - Upload date tracking

**Features:**

- Save/Cancel buttons
- LocationPicker integration
- Document management

#### 9c. Security Settings

**Both Admin Types**

**Sections:**

1. **Change Password:**
   - Current Password (with show/hide toggle)
   - New Password (with show/hide)
   - Confirm Password (with show/hide)
   - Password strength indicator
   - Update Password button

2. **Two-Factor Authentication:**
   - Enable/Disable toggle
   - QR code for setup (when enabled)
   - Backup codes

3. **Active Sessions:**
   - List of logged-in devices
   - Device info: Browser, OS, Location
   - Last active timestamp
   - "Logout" button per session
   - "Logout All Devices" button

4. **Recent Login Activity:**
   - Login history table
   - Columns: Date/Time, Device, Location, Status (Successful/Failed)
   - Shows last 10 logins

**Features:**

- Security alerts
- Session management
- Login monitoring

**Settings Tab Navigation:**

- Searchable via global search
- Search "two factor authentication" → Goes to Security tab
- Search "business hours" → Goes to Business tab
- Search "profile picture" → Goes to Profile tab

---

## Components

### Layout Components

#### Header

**Location:** `src/admin/components/layout/Header.jsx`

**Features:**

- Left: Menu toggle button (mobile), Logo/Title
- Center: Global search bar
  - Click to open search modal
  - Real-time search across all pages
  - Shows matching results with icons and paths
  - Keyboard shortcuts support (Escape to close)
- Right: Dark mode toggle, Notifications bell, Profile dropdown, Admin mode toggle

**Search System:**

- Comprehensive keyword matching
- Navigates to pages or triggers actions
- Supports deep keywords (e.g., "2fa", "bank account")
- Modal overlay with z-index management

**Profile Dropdown:**

- Edit Profile
- Account Settings
- Support
- Sign Out
- Includes confirmation modal for logout

**Notifications Dropdown:**

- Shows recent notifications
- Color-coded by type (success, info, warning)
- Mark as read functionality
- Time elapsed display

#### Sidebar

**Location:** `src/admin/components/layout/Sidebar.jsx`

**Features:**

- Collapsible (toggle button in header)
- Logo at top
- Menu items with icons and labels
- Active page highlighting (green background)
- Expandable sub-menus (chevron indicator)
- Different menu structure for Shop vs Website Admin
- "View Storefront" button at bottom (Shop Admin only)

**Shop Admin Menu:**

- Dashboard
- Analytics (expandable: Overview, Reports, Insights, Impact)
- Orders (expandable: All Orders, Pending, Completed, Deliveries)
- Listings (expandable: All Listings, New Listing)
- Payouts
- Settings

**Website Admin Menu:**

- Dashboard
- Analytics (expandable: Overview, Reports, Insights, Impact)
- Users (expandable: All Users, Roles, Activity)
- Orders (expandable: All Orders, Pending, Completed, Deliveries)
- Listings (expandable: All Listings)
- Vendors (expandable: All Vendors, Vendor Approval)
- Disputes (expandable: Refund Requests, Complaints)
- Payouts
- Settings

#### Confirmation Modal

**Location:** `src/admin/components/ConfirmationModal.jsx`

**Features:**

- Reusable modal for confirmations
- Props: isOpen, onClose, onConfirm, title, message, confirmText, cancelText, type
- Types: danger (red), warning (yellow), info (blue)
- Dark overlay
- Responsive design

---

### Dashboard Components

#### StatsGrid

**Location:** `src/admin/components/Content/StatsGrid.jsx`

**Features:**

- 4 statistics cards in grid layout
- Each card shows: icon, value, label, trend percentage
- Trend indicator with arrow and color (green up, red down)
- Different stats for Shop vs Website Admin
- Responsive grid (1 col mobile, 2 col tablet, 4 col desktop)

#### ChartSection

**Location:** `src/admin/components/Content/ChartSection.jsx`

**Features:**

- Container for 3 charts
- Grid layout (responsive)
- Each chart in white card with title
- Uses Recharts library

**Charts:**

- RevenueChart (Bar): Monthly revenue data
- SalesChart (Line): Sales trends
- OrderTrendsChart (Line): Order volume with period toggle

#### ActivityFeed

**Location:** `src/admin/components/Content/ActivityFeed.jsx`

**Features:**

- Timeline of recent activities
- Scrollable list when content overflows
- Each activity: icon (color-coded), title, description, timestamp
- Activity types: user actions, orders, deliveries, updates
- Matches height of adjacent table section

#### TableSection

**Location:** `src/admin/components/Content/TableSection.jsx`

**Features:**

- Recent orders table (last 5)
- Columns: Order ID, Product (image+name), Category, Price, Status
- Status badges with colors
- Hover effects on rows
- Filter and "See All" buttons
- Responsive table with scroll

#### DisputesTable

**Location:** `src/admin/components/Content/DisputesTable.jsx`

**Features:**

- Recent disputes table
- Shows: Dispute ID, Customer, Vendor, Type, Reason, Amount, Date, Status
- Status badges (Pending, Under Review, Resolved)
- View Details button per dispute
- Same height as TableSection

---

### Public Components

#### Navbar

**Location:** `src/Components/Navbar.jsx`

Main navigation for public pages with links to Home, Shop, About, Contact

#### Footer

**Location:** `src/Components/Footer.jsx`

Footer with company info, links, social media, newsletter signup

#### ProductCard

**Location:** `src/Components/ProductCard.jsx`

Reusable product card showing image, name, price, discount, add to cart

#### Other Components

- Hero, HowItWorks, Testimonials, AboutUs, Categories, etc.
- See file structure for complete list

---

## Context & State Management

### AdminModeContext

**Location:** `src/admin/context/AdminModeContext.jsx`

```javascript
const { adminMode, toggleAdminMode } = useAdminMode();
// adminMode: 'shop' | 'website'
```

**Used By:** Sidebar, Header, StatsGrid, Content, Analytics, Settings

### AppContext

**Location:** `src/context/AppContext.jsx`

Global context for public pages (cart, user data, etc.)

---

## Styling & Theming

### Design System

**Colors:**

- Primary (Green): `bg-solid`, `text-solid` (defined in index.css)
- Background: Gradient from slate to blue to indigo
- Dark mode: Slate shades (800, 900)
- Status colors: Green (success), Yellow (warning), Red (danger), Blue (info)

**Components:**

- Cards: White with 80% opacity, backdrop blur
- Borders: Slate with 50% opacity
- Rounded corners: `rounded-2xl`, `rounded-lg`
- Shadows: Subtle shadows on cards
- Transitions: Smooth color and hover effects

**Dark Mode:**

- Toggle in header
- Uses Tailwind's `dark:` prefix
- Persisted in localStorage
- Affects all components

**Responsive:**

- Mobile-first approach
- Breakpoints: sm, md, lg, xl, 2xl
- Collapsible sidebar on mobile
- Grid layouts adapt to screen size

### Tailwind Configuration

**Location:** `tailwind.config.js`

Custom colors, animations, and utilities defined

### Global Styles

**Location:** `src/index.css`

- Tailwind directives
- Custom CSS variables
- Solid color definitions
- Font imports

---

## Key Features Summary

✅ **Implemented:**

- Dual admin dashboard with mode switching
- Complete analytics system (4 sub-pages)
- Global search with deep keyword matching
- Settings system with multiple tabs
- Payouts for both admin types
- Disputes with detailed sidebar
- Listings management with bulk actions
- Dark mode throughout
- Responsive design
- Chart visualizations

🚧 **Placeholder (Coming Soon):**

- Users management
- Orders management
- Vendors management (Website Admin)
- New Listing form
- Refund Requests view
- Backend API integration

---

## Where to Find Each Page

### Admin Pages

| Page                | Location                                                                 | Route/Navigation                                          |
| ------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------- |
| Dashboard Overview  | `src/admin/components/Content/Content.jsx`                               | Default page, Sidebar → Dashboard                         |
| Analytics Overview  | `src/admin/pages/Analytics.jsx` → ShopAdminOverview/WebsiteAdminOverview | Sidebar → Analytics → Overview                            |
| Analytics Reports   | `src/admin/pages/Analytics.jsx` → ShopAdminReports/WebsiteAdminReports   | Sidebar → Analytics → Reports                             |
| Analytics Insights  | `src/admin/pages/Analytics.jsx` → ShopAdminInsights/WebsiteAdminInsights | Sidebar → Analytics → Insights                            |
| Analytics Impact    | `src/admin/pages/Analytics.jsx` → ShopAdminImpact/WebsiteAdminImpact     | Sidebar → Analytics → Impact                              |
| Users               | `src/admin/pages/Users.jsx`                                              | Sidebar → Users (Website Admin only)                      |
| Orders              | `src/admin/pages/Orders.jsx`                                             | Sidebar → Orders                                          |
| All Listings        | `src/admin/pages/Listings.jsx`                                           | Sidebar → Listings → All Listings                         |
| New Listing         | `src/admin/pages/Listings.jsx`                                           | Sidebar → Listings → New Listing                          |
| Vendors             | `src/admin/pages/Vendors.jsx`                                            | Sidebar → Vendors (Website Admin only)                    |
| Refund Requests     | `src/admin/pages/Disputes.jsx` → RefundRequests                          | Sidebar → Disputes → Refund Requests (Website Admin only) |
| Customer Complaints | `src/admin/pages/Disputes.jsx` → CustomerComplaints                      | Sidebar → Disputes → Complaints (Website Admin only)      |
| Payouts             | `src/admin/pages/Payouts.jsx`                                            | Sidebar → Payouts                                         |
| Settings - Profile  | `src/admin/pages/Settings.jsx`                                           | Sidebar → Settings → Profile tab                          |
| Settings - Business | `src/admin/pages/Settings.jsx`                                           | Sidebar → Settings → Business tab (Shop Admin only)       |
| Settings - Security | `src/admin/pages/Settings.jsx`                                           | Sidebar → Settings → Security tab                         |

### Public Pages

| Page                  | Location                             | Route/URL         |
| --------------------- | ------------------------------------ | ----------------- |
| Home                  | `src/Pages/Home.jsx`                 | `/`               |
| Shop                  | `src/Pages/Shop.jsx`                 | `/shop`           |
| Product Details       | `src/Pages/ProductDetails.jsx`       | `/product/:id`    |
| Cart                  | `src/Pages/Cart.jsx`                 | `/cart`           |
| Login                 | `src/Pages/Login.jsx`                | `/login`          |
| Sign Up               | `src/Pages/SignUp.jsx`               | `/signup`         |
| My Profile            | `src/Pages/MyProfile.jsx`            | `/profile`        |
| My Orders             | `src/Pages/MyOrders.jsx`             | `/orders`         |
| My Impact             | `src/Pages/MyImpact.jsx`             | `/impact`         |
| Category Page         | `src/Pages/CategoryPage.jsx`         | `/category/:name` |
| Contact Us            | `src/Pages/ContactUs.jsx`            | `/contact`        |
| FAQ                   | `src/Pages/FAQ.jsx`                  | `/faq`            |
| Business Verification | `src/Pages/BusinessVerification.jsx` | `/verify`         |
| Pending Review        | `src/Pages/PendingReview.jsx`        | `/pending`        |
| Notifications         | `src/Pages/Notification.jsx`         | `/notifications`  |

---

## Development Notes

### Current Data Source

All admin pages currently use **dummy data** from:

- `src/assets/assets.js` - Product data
- Component files - Hardcoded sample data

### Next Steps for Backend Integration

1. Replace dummy data with API calls
2. Implement authentication and session management
3. Add real-time updates with WebSocket
4. Implement image upload functionality
5. Add form validation and error handling
6. Create loading states and skeleton screens

### Design Patterns Used

- Context API for global state
- Component composition
- Custom hooks (useGeolocation)
- Controlled components for forms
- Conditional rendering based on admin mode

---

**Last Updated:** January 28, 2026  
**Version:** 2.0  
**Maintainer:** ChopNow Development Team
