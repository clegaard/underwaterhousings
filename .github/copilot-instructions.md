# Underwater Camera Housings - AI Coding Guide

## Project Overview
This is a Next.js 14 catalog application for underwater camera housings from manufacturers like Nauticam, Sea Frogs, and DiveVolk. The app uses TypeScript, Tailwind CSS, Prisma ORM with PostgreSQL, and follows a manufacturer → housing → camera compatibility model.

## Key Architecture Patterns

### Scraping
- Scrapers should extract prices in USD per default
- Data sourced from manufacturer websites such as Nauticam and Sea Frogs
- Scrapers are in `automations/` and use Cheerio for HTML parsing
- Output is structured JSON for easy Prisma seeding
- Scrapers include logic to determine features like interchangeable ports based on title keywords and spec tables
- Scraping is a one-time operation per manufacturer, with manual review of output before seeding
- Scrapers are designed to be idempotent and can be re-run if needed without affecting existing data
- Scraping logic is tightly coupled to the specific HTML structure of each manufacturer's site, so changes to those sites may require scraper updates
- Scrapers also extract camera compatibility information to populate the many-to-many relationships in the database
- Scrapers include error handling and logging to identify issues during data extraction
- Scrapers are run locally and the output JSON is committed to the repository for transparency and version control
- Scrapers are not part of the regular development workflow and are only used when adding new manufacturers or updating existing data
- Scrapers are documented with comments to explain the logic and assumptions made during data extraction
- Scrapers are designed to minimize the number of HTTP requests by extracting all necessary data from a single page when possible, rather than following multiple links



### Database Schema (Prisma)
- **Core entities**: `HousingManufacturer`, `CameraManufacturer`, `Camera`, `Housing`
- **Relationships**: Housings belong to manufacturers and are compatible with specific cameras
- **Slugs are critical**: All entities use URL-friendly slugs (`nauticam`, `seafrogs`, `na-om-5-ii`)
- **Prisma client singleton**: Use `prisma` from `@/lib/prisma.ts` (includes query logging in dev)

### Route Structure & File-Based Routing
- `/housings/[manufacturer]` - Manufacturer housing listings
- `/housings/[manufacturer]/[housing]` - Individual housing detail pages
- `/cameras/[manufacturer]` - Camera manufacturer listings
- `/api/admin/*` - CRUD operations with slug generation utilities

### Image Asset Conventions
Images follow strict naming: `/public/housings/{manufacturerSlug}/{housingSlug}/{front|back}.webp`
- Always use `getHousingImagePathWithFallback()` from `@/lib/images.ts`
- Fallback to `/housings/fallback.png` for missing images
- Use `HousingImage` component for consistent error handling

### Data Fetching Patterns
- **Server Components**: Direct Prisma queries for page data (see housing detail pages)
- **Client Components**: Fetch from API routes (see `NavigationWrapper.tsx`)
- **API responses**: Consistent structure with `{ success, data, count, filters }`
- **Includes**: Always include related entities: `manufacturer: true`, `Camera: { include: { brand: true } }`

## Development Workflows

### Database Operations
```bash
npm run db:push        # Apply schema changes (development)
npm run db:migrate     # Create migration files
npm run db:studio      # Open Prisma Studio UI
npm run db:seed        # Populate with sample data
```

### Essential Commands
- Development: `npm run dev` (Next.js with hot reload)
- Build check: `npm run build && npm run start`
- Linting: `npm run lint` (ESLint with Next.js config)

## Component Patterns

### Filter Components
Client-side filtering uses controlled state patterns (see `HousingFilters.tsx`):
- Maintains filter state with type-safe `FilterState` interface
- Real-time filtering without API calls for better UX
- Combines multiple filter criteria (price, depth, manufacturer, camera compatibility)

### Admin CRUD Operations
Admin routes (`/api/admin/*`) include:
- Slug auto-generation from names using `createSlug()` utility
- Consistent error handling with 500 status codes
- Full CRUD with proper Prisma includes for related data

### Navigation Patterns
- `NavigationWrapper` fetches manufacturer data client-side for dynamic menus
- Uses Promise.all for parallel API requests
- Implements loading states for better UX

## Project-Specific Conventions

### Slug Generation
Critical for SEO and routing:
```typescript
function createSlug(text: string): string {
    return text.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
}
```

### Price Handling
- Uses Prisma `Decimal` type for precise currency amounts
- Supports multiple currencies (defaults to USD)
- Filter operations use `parseFloat()` for price comparisons

### Type Safety
- Prisma generates types automatically
- Interface definitions for component props (see housing detail pages)
- Consistent error boundary patterns with `notFound()` from Next.js

## Integration Points

### Static Assets
- Housing images stored in `/public/housings/` with manufacturer/housing hierarchy
- Camera images in `/public/cameras/` (similar structure)
- WebP format preferred for performance

### Database Relationships
- Many housings can be compatible with the same camera
- Manufacturers have both housings and cameras (separate entities)
- All relationships use Prisma foreign keys with proper cascade behavior

When working on this codebase, prioritize maintaining the slug-based routing system, consistent image handling patterns, and the manufacturer-centric data organization.