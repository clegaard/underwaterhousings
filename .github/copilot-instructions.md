# Underwater Camera Housings - AI Coding Guide


## Project Overview
This is a Next.js 16 application for building, reviewing and uploading photos taken with different underwater camera systems providing a resource for the user to make an decision on which system is best for them by providing concrete examples of the photos taken with each system.

The goal of the system is:
- To make it easier for photographers to select the right underwater camera system for their needs by providing a comprehensive gallery of user submitted photos taken with different underwater camera systems, along with detailed information about the housings and cameras used to take those photos.
- To provide a platform for photographers to share their underwater photos and the camera systems they used to take them, fostering a community of underwater photographers and enthusiasts.
- To create a resource that helps photographers understand the differences between various underwater camera systems and make informed decisions when purchasing equipment for underwater photography.

In the context of this application a underwater camera system refers to any collection of compatible products that allows the user to take the system safely underwater and take pictures.

Examples of such systems are:
- Waterproof action cameras like the DJI OSMO Action 5 or GoPro Hero 11
- Waterproof action cameras like the DJI OSMO Action 5 in a waterproof housing
- Waterproof compact cameras like the Olympus Tough TG-6
- Waterproof compact cameras like the Olympus Tough TG-6 in a waterproof housing like the Nauticam NA-TG6

The app uses TypeScript, Tailwind CSS, Prisma ORM with PostgreSQL, and follows a manufacturer → housing → camera compatibility model.

## Design Principles
- The website should be designed to work well on desktop as well as mobile devices, with a responsive layout that adapts to different screen sizes and orientations.
- The website should be designed with a clean and modern aesthetic, using a consistent color scheme and typography that is easy to read and visually appealing.
- The website should be designed with a focus on usability and user experience, with intuitive navigation and clear calls to action that guide users through the site and encourage them to explore the content and submit their own photos.
- The website should be designed with accessibility in mind, following best practices for web accessibility to ensure that it can be used by as many people as possible, including those with disabilities.
- The website should be designed to load quickly and perform well, with optimized images and efficient code that minimizes load times and provides a smooth user experience.
- The website should be designed to be scalable and maintainable, with a modular architecture and clean code that allows for easy updates and additions as the project grows and evolves over time.
- The website should be designed to foster a sense of community among underwater photographers, with features that encourage users to share their photos and engage with each other, such as comments, likes, and user profiles.
- The website should add tooltips to provide additional information about technical terms and concepts related to underwater photography, such as depth rating, port types, and camera compatibility, to help educate users and enhance their understanding of the equipment and techniques used in underwater photography.
- Tooltips should have a consistent style and be easily accessible, appearing when users hover over or click on relevant terms throughout the site, providing concise and informative explanations to enhance the user experience and promote learning about underwater photography.

### Optional fields
Whenever a field is optional mark it with a (optional) label in the.
Avoid using the asterisk to mark required fields, instead only mark the optional ones.

### Tooltips
Place tooltips next to technical terms and concepts related to underwater photography, such as depth rating, port types, and camera compatibility, to help educate users and enhance their understanding of the equipment and techniques used in underwater photography.
On dekstop the tooltips should appear when users hover over the relevant terms, while on mobile devices they should appear when users tap on the relevant terms. The tooltips should have a consistent style and be easily accessible, providing concise and informative explanations to enhance the user experience and promote learning about underwater photography.

## Key Architecture Patterns

### Scraping
- Scrapers should extract prices in USD by default
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

## Products

The product page shows various components of a underwater camera system, such as:
* Camera bodies
* Lenses
* Camera housing
* Ports
* Extension rings
* Adaptor rings
* Wet optics
* Flash triggers
* Strobes
* External monitor housings

We categorize these components by their manufacturer.
In most cases a manufacturer produces falls into one of two categories:
- Camera manufacturers: These are companies that produce cameras and lenses, such as Sony, Olympus and Canon.
- Housing manufacturers: These are companies that produce underwater housings and accessories, such as Nauticam and Sea Frogs.

However there are also companies such as SeaLife that produce both cameras and housings.

### Camera Housings
- **Definition**: Protective enclosures that allow photographers to use their cameras underwater while keeping them dry and functional.
- **Key characteristics**: Manufacturer, depth rating, material, price, weight, port system

- **Compatibility**: Housings are designed to fit specific camera models, and compatibility is a critical aspect of the product catalog. 

Housings for interchangeable lens cameras often have modular port systems that allow for different lenses to be used with the same housing, with an appropriate choice of ports. Generally speaking, housings for compact cameras have fixed ports that are designed to fit the specific camera model, while housings for interchangeable lens cameras have modular port systems that allow for different lenses to be used with the same housing, with an appropriate choice of ports.

In a few instances a housing has a fixed port but is compatible with multiple cameras, such as the Nauticam NA-OM-5 II which has a fixed port but is compatible with both the Olympus OM-5 and OM-1 Mark II.

Additionally, some housings are designed for a camera with interchangeable lenses, but the housing itself does not have a modular port system. For example, the Nauticam NA-A7C is compatible with the Sony A7C, which is an interchangeable lens camera, but the housing has a fixed port that is designed to fit the A7C with its kit lens. In this case, the housing is only compatible with the A7C when it is used with the kit lens, and not with other lenses that may be available for the A7C.

A class of housings for smartphones also exist that are universal and can accommodate a wide range of phone models.

### Ports

A port is a part of an underwater camera rig that houses the camera lens and allows it to be used underwater.
Ports can either be flat or dome-shaped, and they are designed to fit specific camera lenses. The choice of port can affect the image quality and field of view when shooting underwater, so it is an important consideration for photographers when selecting a housing for their camera.

For instance using a flat-port increases the magnification of the lens and reduces the field of view, while a dome port can help to maintain the original field of view of the lens and reduce distortion.

The distortion and increased magnification is less of an issue when shooting at higher focal lengths like 100mm, but can be a significant issue when shooting wide-angle with a lens like a 16-35mm. For this reason, many photographers prefer to use dome ports for wide-angle shooting and flat ports for macro shooting.
In fact, the increased magnification and reduced field of view can be desirable for macro shooting, as it allows photographers to get closer to their subjects and capture more detail. For this reason, many photographers prefer to use flat ports for macro shooting.


### Extension rings
Extension rings are accessories that can be added to underwater camera housings to increase the distance between the camera and the port. This can be useful for a variety of reasons, such as allowing for more space to accommodate larger lenses or providing additional clearance for certain camera models.

For a given combination of camera, housing and lens the manufacturer recommends a specific configuration of extension rings to place the camera's iris at an optimal position within the port to avoid vignetting and reduce distortion.

Extension rings are designed to fit a specific port mount, so they are not universally compatible with all housings and ports. For example, a Nauticam extension ring designed for a specific housing and port combination may not be compatible with a Sea Frogs housing and port combination, even if the camera and lens are the same. It is important for photographers to consult the manufacturer's recommendations for extension ring configurations to ensure optimal image quality and compatibility with their specific camera, housing, and lens setup.

### Adaptor rings
The purpose of adaptor rings is to convert between different port mounts, allowing for greater flexibility in using one port with multiple housings.
For instance, Nauticam provides N85 to N100 adapters.

Additionally, some manufacturers like Isotta provide an adapter from their port system to the port system of other manufacturers. For instance, Isotta provides an adapter from their B120 port to Nauticam's N120 port.

### Product Photos
Product photos should use a 1:1 aspect ratio to maintain consistency across various parts of the site like the product pages and search bar thumbnails.
Images should have transparant backgrounds to allow for a consistent look across the site and to avoid issues with dark mode.

## Gallery and User Submissions


### Rig assignment and exif data
When a user uploads a photo, they can specify the camera and housing used to take the photo. This information is important for categorizing the photo and providing context for other users who may be interested in the equipment used to capture the image.
A rig is characterized by it's components, primarily the camera, lens, housing and port.

When uploading a photo from the the users device the exif data is a valuable source of information since manipulating these requires a certain level of technical knowledge and is not something that the average user would typically do.
The exif data only proivides information of the electronic components of the rig like the camera, lens and in some cases teleconverters.
However, exif data does not provide information about the housing, port, wet optics, extension rings, since these are purely mechanical components.
Further, exif data does not usually provide infomation about the flash trigger or strobes, although in the case of the flash trigger it would be technically feasible to add this information to the exif data since it is connected to the hotshoe.

*Rule G1* : If present accept EXIF data as ground truth for camera, lens, shutter speed, aperture, ISO and focal length, do not allow the user to edit these fields.

We allow the user to select a user defined rig to add this supplementary information.
For instance the user may have defined a rig with a specific housing, port and extension ring combination that they typically use with their camera, and they can select this rig when uploading a photo to provide more complete information about the equipment used to take the photo.

*Rule G2* : Only allow the user to select a rig that does not conflict with the exif data. For instance, the user should not be able to select a rig that specifies a different camera or lens than the one specified in the exif data.

To aid in the users understanding of how the metadata is derived as well as the trustworthiness of the metadata, we will display the source of the metadata information. For instance, if the camera and lens information is derived from the exif data, we will display an exif icon next to this information. If the housing and port information is derived from a user defined rig, we will display a rig icon next to this information.
*Rule G3* : When uploading images, record the sources of this information, for instance, exif, geotag, caption or user specified.


#### Instagram Uploads and Caption Parsing
Instagram strips the metadata when uploading to their server, so it is not possible to populate this by means of reading the exif data.

A common practice is to add information of the camera, lens, housing, ports and acessories as part of the caption.
We would like to automatically extract this information such that as much of this information is pre-populated in the form as possible.

See the `captions-examples.md` directory for examples of how users typically specify this information in the caption.

Some fields like the location can be extracted either form the geotag if specified or from the caption itself.
Similarly the date can either be extracted from the upload date or preferably from the caption itself.

*Rule G4* : When uploading from instagram, use the geotag as the first priority for the location, and only use the caption as a second priority if the geotag is not specified.

*Rule G5* : When uploading from instagram, use any date specified in the caption as the first priority, and only use the upload date as a second priority if no date is specified in the caption.

*Rule G6* : Information extracted by geo location, caption or upload data should be editable by the user.

### Image formats
We strive to support a wide range of image formats to accommodate the various ways users may have stored their photos.

Some formats like HEIC are not universally supported or may have restrivtive licenses so we opt to convert these to a more widely supported format.

To avoid burdening the server we prefer client side conversion when possible using the 
The file format priorities are:
1. AVIF
2. WebP

