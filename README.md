# RYOKO — Travel Journal & Data Structures Platform

> **Phase 0: Project Foundation**

RYOKO is a modern web application designed as a vintage travel journal and itinerary planner. It combines cozy, tactile aesthetics with rigorous Data Structures and Algorithms engineered from first principles.

---

## 🛠️ Technology Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Custom CSS Token Design System (`src/styles/tokens.css`)
- **Animations**: Framer Motion
- **Routing**: React Router (`react-router-dom`)
- **Icons**: Lucide React
- **Testing**: Vitest

---

## 🏛️ Project Architecture

RYOKO enforces a strict separation of concerns across clean architectural layers:

```
UI (React Components & Routes)
  └── Feature Modules (globe, aan, destinations, trip-planner, itinerary, etc.)
       └── Services Layer (destinationService, itineraryService, weatherService)
            └── Custom Data Structures & Algorithms (Graph, Trie, Priority Queue, Dijkstra, BFS, DFS)
                 └── Data Layer (Typed Mock Models)
```

### Directory Map

- `src/app/` — Application entry point, router configuration (`routes.tsx`), and context providers (`AppProvider.tsx`).
- `src/components/` — UI components partitioned into `ui/` (base components), `layout/` (page layouts & headers), and `shared/` (utilities).
- `src/features/` — Feature modules (`globe`, `aan`, `destinations`, `trip-planner`, `recommendations`, `itinerary`, `passport`, `weather`).
- `src/ds/` — Custom Data Structure implementations (**Graph**, **Trie**, **PriorityQueue**, **LinkedList**, **HashMap**, **Stack**).
- `src/algorithms/` — Pure algorithmic solvers (**Dijkstra**, **BFS**, **DFS**).
- `src/data/` — Typed mock datasets (`destinations`, `attractions`, `restaurants`, `hotels`, `transport`, `outfits`, `mockWeather`).
- `src/services/` — Business logic bridging features to core data structures and algorithms.
- `src/types/` — Standardized TypeScript domain types.
- `src/styles/` — CSS design tokens (`tokens.css`) defining colors, typography, spacing, and shadows.
- `src/tests/` — Unit test suites for data structures and algorithms.
- `docs/` — Architectural and data structures documentation.

---

## 🎨 Design System

RYOKO utilizes a custom palette tailored for an organic, vintage travel journal experience:

- **Deep Forest**: `#0A3323`
- **Moss**: `#839958`
- **Cream**: `#F7F4D5`
- **Rosy Brown**: `#D3968C`
- **Midnight Green**: `#105666`
- **Soft Sky**: `#AFC3D8`
- **Warm Sand**: `#E5D8C8`
- **Deep Brown**: `#492F1E`

---

## 🚀 Running the Project

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Places API (Optional for Live Discovery)
Ryoko includes an integrated OpenTripMap server-side proxy (`/api/places`) to discover verified attractions for uncurated global destinations:

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Set the `OPENTRIPMAP_API_KEY` environment variable in `.env.local`:
   ```env
   OPENTRIPMAP_API_KEY=your_opentripmap_api_key_here
   ```
   *(Get a free API key at [opentripmap.io](https://opentripmap.io/))*

> **🔒 Security Architecture Notice:**
> - The API key variable is named **`OPENTRIPMAP_API_KEY`** (never prefix with `VITE_`).
> - Vite loads this variable server-side via `placesProxyPlugin` using `loadEnv()`.
> - The key is used **strictly server-side** by the local `/api/places` proxy middleware and serverless routes.
> - The key is **never bundled** into the client JavaScript bundle, browser storage, or frontend code.
> - Curated destinations (**Paris, Cairo, Tokyo, Mumbai, Rome**) always take full precedence and do not query the external provider.
> - If no key is configured or the provider returns no results, Ryoko honestly presents an empty schedule with zero fabricated costs.

### 3. Start Development Server
```bash
npm run dev
```

### 4. Run Automated Tests
```bash
npm test
```

### 5. Build for Production
```bash
npm run build
```

---

## 📚 Documentation

For in-depth documentation, see:
- [`docs/architecture.md`](file:///c:/Users/Asus/ryoko/docs/architecture.md) — Detailed layer separation & architectural principles.
- [`docs/data-structures.md`](file:///c:/Users/Asus/ryoko/docs/data-structures.md) — Specifications for custom Data Structures and Algorithms.
