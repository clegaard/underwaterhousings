# Underwater Camera Housings - AI Coding Guide

## Project Overview
This is a Next.js 14 catalog application for underwater camera housings from manufacturers like Nauticam, Sea Frogs, and DiveVolk. The app uses TypeScript, Tailwind CSS, Prisma ORM with PostgreSQL, and follows a manufacturer → housing → camera compatibility model.

## Key Architecture Patterns

### Scraping
- Scrapers should extract prices in USD per default
- Data sourced from manufacturer websites such as Nauticam and Sea Frogs
- Scrapers are in `automations/`
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


## Underwater camera rigs



### Underwater Housings
- **Definition**: Protective enclosures that allow photographers to use their cameras underwater while keeping them dry and functional.
- **Key characteristics**: Manufacturer, depth rating, material, price, weight, port system

- **Compatibility**: Housings are designed to fit specific camera models, and compatibility is a critical aspect of the product catalog. 

Housings for interchangeable lens cameras often have modular port systems that allow for different lenses to be used with the same housing, with an appopriate choice of ports. Generally speaking, housings for compact cameras have fixed ports that are designed to fit the specific camera model, while housings for interchangeable lens cameras have modular port systems that allow for different lenses to be used with the same housing, with an appopriate choice of ports.

In a few instances a housing has a fixed port but is compatible with multiple cameras, such as the Nauticam NA-OM-5 II which has a fixed port but is compatible with both the Olympus OM-5 and OM-1 Mark II.

Additionally, some housings are designed for a camera with interchangeable lenses, but the housing itself does not have a modular port system. For example, the Nauticam NA-A7C is compatible with the Sony A7C, which is an interchangeable lens camera, but the housing has a fixed port that is designed to fit the A7C with its kit lens. In this case, the housing is only compatible with the A7C when it is used with the kit lens, and not with other lenses that may be available for the A7C.

A class of housings for smartphones also exist that are universal and can accommodate a wide range of phone models.

### Ports

A port is a part of a underwater camera rig that houses the camera lens and allows it to be used underwater.
Ports can either be flat or dome-shaped, and they are designed to fit specific camera lenses. The choice of port can affect the image quality and field of view when shooting underwater, so it is an important consideration for photographers when selecting a housing for their camera.

For instance using a flat-port increases the magnification of the lens and reduces the field of view, while a dome port can help to maintain the original field of view of the lens and reduce distortion.

The distortion and increased magnification is less of an issue when shooting with at higher focal lengths like 100mm, but can be a significant issue when shooting wide-angle with a lens like a 16-35mm. For this reason, many photographers prefer to use dome ports for wide-angle shooting and flat ports for macro shooting.
In fact, the increased magnification and reduced field of view can be desirable for macro shooting, as it allows photographers to get closer to their subjects and capture more detail. For this reason, many photographers prefer to use flat ports for macro shooting.


### Extension rings
Extension rings are accessories that can be added to underwater camera housings to increase the distance between the camera and the port. This can be useful for a variety of reasons, such as allowing for more space to accommodate larger lenses or providing additional clearance for certain camera models.

For a given combination of camera, housing and lens the manufacturer recommends a specific configuration of extension rings to place the cameras iris at a optimal position within the port to avoid vignetting and reduce distortion.

Extension rings are designed to fit a specific port mount, so they are not universally compatible with all housings and ports. For example, a Nauticam extension ring designed for a specific housing and port combination may not be compatible with a Sea Frogs housing and port combination, even if the camera and lens are the same. It is important for photographers to consult the manufacturer's recommendations for extension ring configurations to ensure optimal image quality and compatibility with their specific camera, housing, and lens setup.

### Adaptor rings
The purpose of adaptor rings is to convert between different port mounts, allowing for a greater flexibility of using one port with multiple housings.
For instance Nauticam provides adapters from N85 to N100 and N85 to N100.

Additionally, some manufacturers like Isotta provides an adapter from their port system to the port system of other manufacturers. For instance Isotta provides an adapter from their B120 port to nauticams N120 port.
