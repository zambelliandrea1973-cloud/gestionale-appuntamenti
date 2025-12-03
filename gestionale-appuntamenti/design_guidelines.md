# Design Guidelines: Medical Practice User Management Dashboard

## Design Approach

**System Selection**: Material Design foundations with modern SaaS dashboard patterns
**Rationale**: Data-heavy administrative interface requiring clarity, professional trust, and efficient information scanning. Drawing inspiration from Linear's data tables, Stripe's dashboard aesthetics, and Notion's status indicators.

## Typography System

**Primary Font**: Inter or similar geometric sans-serif via Google Fonts
- Page Headers: 2xl/3xl, semibold
- Section Titles: xl, medium
- Table Headers: sm, semibold, uppercase tracking-wide
- Body/Data: sm/base, regular
- Metadata/Secondary: xs/sm, regular with reduced opacity

## Layout & Spacing System

**Container**: max-w-7xl centered with px-4 to px-8 responsive padding
**Vertical Rhythm**: py-6 (mobile) to py-8 (desktop) for main sections
**Core Spacing Units**: 2, 3, 4, 6, 8 (e.g., gap-4, p-6, mb-8)
**Card/Table Padding**: p-6 for cards, px-4 py-3 for table cells

## Page Structure

### Header Section
- Top bar with page title "User Management", breadcrumb trail, and primary action button "Add New User"
- Filter/search bar row below: search input (placeholder: "Search by name, email..."), dropdown filters for user type (All/Trial/Paid/Staff) and status (All/Active/Expiring/Expired)
- Stats overview cards: 4-column grid showing total users, active licenses, trials expiring (<7 days), expired accounts - each with large number display and trend indicator

### Main Content Area

**Dual View Toggle**: Tab controls switching between Table View (default) and Card View

**Table View Design**:
- Full-width responsive table with sticky header
- Columns: Avatar+Name, Email, User Type (badge), License Status (badge with icon), Expiration Date, Days Remaining (with progress indicator), Last Active, Actions (dropdown menu)
- Row height: py-4 for comfortable scanning
- Alternating subtle row backgrounds for readability
- Hover state reveals action menu preview
- Sortable columns with arrow indicators

**Card View Design**:
- 3-column grid (lg:), 2-column (md:), single column (mobile)
- Each card: rounded-lg with subtle elevation, p-6 spacing
- Card layout: Top row - avatar with name/email, status badge
- Middle section: Key metrics in 2-column grid (License Type, Expiration, Days Remaining, Last Active)
- Bottom: Action buttons row with primary action prominent

### Status Indicators

**Badge System**:
- Pill-shaped badges with icon prefixes
- Active: checkmark icon, subtle treatment
- Trial: clock icon, medium emphasis
- Expired: alert icon, strong emphasis
- Varying text treatments (not color-specific) to ensure accessibility

**Progress Indicators**:
- Days remaining shown as thin horizontal progress bar below expiration date
- Segments: >30 days (full), 7-30 days (medium), <7 days (minimal)
- Numerical countdown with unit label

## Component Library

### Action Buttons
**Primary Actions**: "Extend Trial +40 days", "Renew License", "Activate Account"
- Rounded-md buttons with px-4 py-2 sizing
- Icon prefix for common actions
- Implement as button groups when multiple actions available

**Secondary Actions**: Dropdown menu (three-dot icon) containing:
- Edit User Details
- View Activity Log
- Send Notification
- Deactivate/Delete

**Bulk Actions Bar**: Appears when rows selected - floating bar at bottom with checkbox count and batch operations

### Data Table Features
- Column resize handles
- Bulk select with shift-click range selection
- Inline edit capability for quick updates (click-to-edit pattern)
- Empty state with illustration and "Add First User" CTA
- Loading skeleton states for async operations
- Pagination at bottom: showing "1-50 of 247 users" with page number input and prev/next buttons

### Filter & Search
- Instant search with debounce
- Advanced filters panel (collapsible): date range picker, license type multi-select, custom field filters
- Active filters shown as dismissible chips above table
- "Clear all filters" link when filters active

### Modal/Drawer Patterns
- Side drawer for user details/edit (slides from right)
- Center modal for confirmation dialogs (e.g., "Extend trial?")
- Full-page overlay for adding new user (multi-step form)

## Interaction Patterns

**Hover States**: Subtle row highlight on table hover, elevated shadow on card hover
**Focus States**: Strong outline for keyboard navigation
**Loading States**: Skeleton screens for initial load, inline spinners for updates
**Notifications**: Toast messages top-right for success/error feedback
**Drag-to-Reorder**: Column reordering in table view (with grip handle indicator)

## Responsive Behavior

**Desktop (lg:)**: Full table with all columns visible
**Tablet (md:)**: Hide less critical columns (Last Active), show expand icon for full details
**Mobile**: Switch to stacked card view automatically, prioritize essential info

## Professional Polish

- Consistent 8px grid alignment throughout
- Subtle shadows for depth hierarchy (sm for cards, md for modals)
- Smooth transitions (150-200ms) for state changes
- Keyboard shortcuts displayed in action menus
- Export functionality (CSV/PDF) accessible from page header
- Print-optimized view (media query) for reports

**No hero image required** - this is a functional admin interface focused entirely on data management and user interactions.