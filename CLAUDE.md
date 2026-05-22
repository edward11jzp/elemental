# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run build` — Build the project with Vite
- **No dev server script** — The project currently has no `npm run dev` configured. Start by adding a dev script to package.json: `"dev": "vite"` to enable local development

### Vulnerabilities
- Run `npm audit --json` to check security issues. Currently has 1 high-severity vulnerability in Vite 6.3.5. This is inherited from the Figma Make project template.

## Project Overview

**Elemental** is a full-featured e-commerce store built from a Figma Make export. It's a React + TypeScript app with both customer-facing and admin interfaces.

### Tech Stack
- **Framework**: React 18.3.1 with TypeScript
- **Build**: Vite 6.3.5
- **Router**: React Router 7
- **Styling**: Tailwind CSS 4.1.12 + Emotion (Styled Components)
- **UI Components**: Radix UI + shadcn/ui components + Material-UI
- **State Management**: React Context (localStorage-backed)
- **Forms**: React Hook Form
- **Animation**: Motion library
- **Tables/Charts**: Recharts, Embla Carousel

## Architecture

### State Management (Context-Based)
All app state lives in `src/app/context.tsx`, exposed via `useApp()` hook. State persists to localStorage with versioning (e.g., `elemental_products_v3`). The context handles:
- **Cart**: Add/remove items, calculate totals, manage quantities
- **Products**: CRUD operations on inventory
- **Orders**: Track customer orders with status workflow
- **Users**: Customer/employee/admin user management
- **Locations**: Store locations across shopping centers
- **Payment Info**: Multiple payment methods (Zelle, Binance, Pago Móvil, Bank Transfer, Colombian Pesos)
- **Social Media**: Active social links
- **Site Settings**: Global tagline and branding

**Pricing Model**: 
- Retail price for 1-5 items, wholesale price for 6+ items
- Products can have custom pricing tiers per size range (small/medium/large)
- Cart calculates totals based on total item quantity across all products

### Routing Structure
`src/app/routes.ts` defines two main route trees:

**Customer Routes** (Root path `/`):
- `/` — Home page
- `/men/:subcategory`, `/women/:subcategory`, `/kids/:subcategory`, `/shop/:subcategory` — Category pages
- `/product/:id` — Product detail
- `/cart`, `/checkout` — Shopping flow
- `/account/login`, `/account` — Customer account
- `/locations`, `/about`, `/contact`, `/wholesale` — Info pages
- `/*` — 404 Not Found

**Admin Routes** (Root path `/admin`):
- `/admin/login` — Admin authentication
- `/admin/dashboard` — Overview
- `/admin/inventory` — Product management
- `/admin/orders` — Order management
- `/admin/users` — User management
- `/admin/locations` — Store locations
- `/admin/social` — Social media links
- `/admin/payment-info` — Payment method setup
- `/admin/settings` — Site configuration

### Page & Component Structure

**Pages** (`src/app/pages/`): Full-page components for each route. Root.tsx and AdminRoot.tsx wrap the child routes with layouts (Navigation, Footer, AdminNav).

**Components** (`src/app/components/`): 
- `ui/` subdirectory — Exported shadcn/ui components (Button, Card, Dialog, Input, Select, etc.)
- Shared components — CartPanel, Navigation, Footer, AnimatedSection, etc.

**Data** (`src/app/data.ts`): Mock product data (`mockProducts`) with >100 color options, size variants (XS-3XL), and category/subcategory taxonomy.

**Hooks** (`src/app/hooks/`): `useScrollAnimation` for scroll-triggered animations.

### Type System
All domain types are in `src/app/types.ts`:
- **Product**: Includes retail/wholesale pricing, customization support, multiple images
- **CartItem**: Product + size/color/custom details
- **Order**: Status workflow (pending → approved → in_progress → completed/rejected)
- **User**: Roles (customer, employee, admin)
- **PaymentMethod**: Card, Zelle, Binance, Pago Móvil, Bank Transfer, Colombian Pesos
- **Location, SocialMedia, PaymentInfo**: Admin-managed content

### Styling Approach
- **Tailwind CSS**: Utility-first for layout and spacing
- **Emotion (CSS-in-JS)**: Used by Material-UI and some components for dynamic styles
- **Custom CSS**: `src/styles/` directory (not yet explored)
- **Theme**: `default_shadcn_theme.css` provides shadcn theme variables
- The vite.config includes both React and Tailwind plugins (required for Figma Make compatibility)

### Data Persistence
All state is client-side localStorage with JSON serialization. No backend API yet. Reload the app to persist changes across sessions. When adding new data structures, increment the localStorage version key (e.g., `elemental_products_v4`) to force data reload and avoid stale cache issues.

## Development Patterns

### Adding a New Page
1. Create component in `src/app/pages/NewPage.tsx`
2. Add route to `routes.ts`
3. Use `useApp()` for any global state
4. Use `useNavigate()` from React Router for links

### Adding a Product Feature
1. Extend `Product` interface in `types.ts` if needed
2. Add state handler to `context.tsx` (follow existing pattern of useState + useEffect for localStorage)
3. Increment localStorage version key to clear old data
4. Use `useApp()` to access in components

### Custom/Personalization Features
Products support customization (custom logos, embroidery notes, print sizes). CartItem includes `isCustom`, `customLogo`, `customNotes`, and `customPrintSize` fields. Pricing for custom items should use the `customPricing` object on the Product.

### Wholesale Pricing
Triggered automatically when cart total quantity >= 6. The `calculatePrice()` function in context handles the logic. Each product can have separate `retailPrice` and `wholesalePrice` values.

## Common Tasks

### To Run a Dev Server
1. Add this to `package.json` scripts: `"dev": "vite"`
2. Run `npm run dev`
3. Open the printed localhost URL (usually http://localhost:5173)

### To Add a New Payment Method
1. Extend `PaymentMethod` type in `types.ts`
2. Add fields to `PaymentInfo` interface
3. Add corresponding form fields in Admin Payment Info page
4. Update `initialPaymentInfo` in context if adding default payment

### To Modify Product Colors or Sizes
- Edit `ALL_COLORS` array in `src/app/data.ts`
- Update `Product.colors` and `Product.sizes` fields as needed
- Rebuild to reflect changes

### To Reset All Data to Defaults
Open browser console and run:
```javascript
['elemental_cart', 'elemental_users', 'elemental_orders', 'elemental_products', 'elemental_locations', 'elemental_social_media', 'elemental_payment_info', 'elemental_site_settings'].forEach(key => localStorage.removeItem(key))
```
Then reload the page.

## Known Issues & Notes

- **No backend**: All data is mock/localStorage only. Implementing a real backend would require replacing context actions with API calls.
- **Auth is mocked**: The `login()` function in context always succeeds. Real authentication needs to be added.
- **Figma Make-specific files**: `__figma__entrypoint__.ts` and `clear-storage.html` are artifacts from the Figma export—can be left as-is.
- **Vite vulnerability**: Vite 6.3.5 has a known high-severity issue. Update when a fix is released.
