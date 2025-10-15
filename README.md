# underwaterhousings
Static website for my domains underwaterhousings.xyz domains

## Tech Stack

- **Next.js 15** - React framework for static site generation
- **Tailwind CSS v4** - Utility-first CSS framework
- **TypeScript** - Type-safe development

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Installation

```bash
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Build

Build the static site:

```bash
npm run build
```

The static files will be exported to the `out/` directory.

### Production

To serve the static site, you can use any static hosting service:

```bash
npx serve out
```

## Project Structure

```
.
├── app/
│   ├── globals.css      # Global styles with Tailwind imports
│   ├── layout.tsx       # Root layout component
│   └── page.tsx         # Homepage
├── next.config.ts       # Next.js configuration with static export
├── tsconfig.json        # TypeScript configuration
├── postcss.config.js    # PostCSS configuration for Tailwind
└── package.json         # Project dependencies and scripts
```

## License

Apache License 2.0
