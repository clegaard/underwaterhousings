# Underwater Camera Housings Catalog

A comprehensive Next.js application for managing and displaying underwater camera housing products from leading manufacturers including Nauticam, Aquatica, Isotta, AOI, Sea Frogs, and DiveVolk.

## 🚀 Features

- **Comprehensive Database Schema**: Detailed Prisma schema covering manufacturers, camera brands, housing products, compatibility, and accessories
- **Multi-Manufacturer Support**: Scrapes and manages data from 6 major underwater housing manufacturers
- **Modern Tech Stack**: Next.js 14, TypeScript, Tailwind CSS, PostgreSQL, Prisma ORM
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Type-Safe Database Access**: Full TypeScript integration with Prisma

## 🏗️ Architecture

### Database Schema Overview

The application uses a comprehensive relational database schema designed specifically for underwater housing catalogs:

#### Core Entities

1. **Manufacturers** - Housing manufacturers (Nauticam, Aquatica, etc.)
2. **Camera Brands** - Camera manufacturers (Canon, Nikon, Sony, etc.)
3. **Camera Models** - Specific camera models with technical specifications
4. **Housings** - Underwater housing products with full specifications
5. **Housing Compatibility** - Many-to-many relationship between housings and cameras
6. **Accessories** - Housing accessories (ports, arms, strobes, etc.)
7. **Reviews** - User reviews and ratings for housings

#### Key Features

- **Flexible Pricing**: Support for multiple currencies and pricing formats
- **Technical Specifications**: Detailed specs including depth ratings, materials, dimensions
- **Compatibility Matrix**: Track which cameras work with which housings
- **Accessory System**: Comprehensive accessory catalog with compatibility tracking
- **Review System**: User reviews with ratings and moderation
- **Scraping Logs**: Track data scraping operations and results

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### 1. Clone and Install

```bash
cd underwater-housings
npm install
```

### 2. Database Setup

1. **Create a PostgreSQL database**:
```sql
CREATE DATABASE underwater_housings;
```

2. **Configure environment variables** in `.env`:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/underwater_housings?schema=public"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Initialize Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed with sample data
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📊 Database Schema

### Manufacturers
```typescript
model Manufacturer {
  id          String    @id @default(cuid())
  name        String    @unique
  slug        String    @unique
  website     String?
  description String?
  country     String?
  founded     Int?
  // ... relations to housings and accessories
}
```

### Camera System
```typescript
model CameraBrand {
  id          String    @id @default(cuid())
  name        String    @unique
  // ... relations to camera models
}

model CameraModel {
  id            String    @id @default(cuid())
  name          String
  fullName      String
  type          CameraType  // DSLR, MIRRORLESS, etc.
  specifications Json?
  // ... relations
}
```

### Housing Products
```typescript
model Housing {
  id              String          @id @default(cuid())
  model           String
  name            String
  category        HousingCategory
  priceAmount     Decimal?
  depthRating     String?
  material        String?
  // ... extensive specification fields
}
```

## 🌐 Scraped Websites

The schema is designed based on data patterns from these manufacturers:

1. **[Nauticam](https://www.nauticam.com/collections/housings)** - Premium aluminum housings
2. **[Aquatica](https://www.aquatica.ca/housings/)** - Professional Canon/Nikon housings  
3. **[Isotta](https://www.isotecnic.it/en/products-eng/housings-en.html)** - Italian precision housings
4. **[DiveVolk](https://www.divevolkdiving.com/collections/housing)** - Innovative smartphone housings
5. **[AOI](https://www.aoi-uw.com/products/housings.html)** - Taiwanese mirrorless housings
6. **[Sea Frogs](https://www.seafrogs.com.hk/)** - Affordable housing solutions

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database with sample data

## 📁 Project Structure

```
underwater-housings/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts               # Seed data
├── src/
│   ├── app/                  # Next.js app directory
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Home page
│   │   └── globals.css       # Global styles
│   └── lib/
│       └── prisma.ts         # Prisma client config
├── next.config.js            # Next.js configuration
├── tailwind.config.js        # Tailwind CSS config
└── tsconfig.json            # TypeScript config
```

## 🎯 Next Steps

With this foundation, you can now:

1. **Build API Routes**: Create REST/GraphQL APIs for housing data
2. **Implement Search**: Add full-text search and filtering
3. **Add Authentication**: User accounts and favorites
4. **Build Admin Panel**: Manage products and reviews
5. **Create Scrapers**: Automated data collection from manufacturer websites
6. **Add E-commerce**: Shopping cart and checkout functionality

## 📋 Housing Categories Supported

- **Camera Housings** - DSLR and mirrorless camera housings
- **Compact Housings** - Point-and-shoot camera housings  
- **Cinema Housings** - Professional video camera housings
- **Monitor Housings** - External monitor housings
- **Smartphone Housings** - Waterproof phone cases
- **Action Cam Housings** - GoPro and action camera housings

## 🎨 Design Philosophy

The schema is designed to be:

- **Flexible** - Accommodate various manufacturer data formats
- **Extensible** - Easy to add new fields and relationships
- **Normalized** - Proper relational design avoiding data duplication
- **Type-Safe** - Full TypeScript integration
- **Scalable** - Efficient queries and indexing

## 📝 License

This project is open source and available under the MIT License.