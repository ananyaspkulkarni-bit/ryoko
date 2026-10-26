# RYOKO Architecture Guide

## Overview

RYOKO is designed as a clean, scalable web application where UI, business services, and fundamental data structures operate independently.

## Layer Breakdown

```
+-------------------------------------------------------+
|                      UI Layer                         |
|   (React Components, Layouts, App Routes, Providers)   |
+-------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------+
|                    Feature Layer                      |
|  (Globe, Aan, Destinations, Trip Planner, Itinerary)  |
+-------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------+
|                    Service Layer                      |
|  (destinationService, itineraryService, etc.)         |
+-------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------+
|            Data Structures & Algorithms Layer         |
|  (Graph, Trie, PriorityQueue, Dijkstra, BFS, DFS)    |
+-------------------------------------------------------+
                           |
                           v
+-------------------------------------------------------+
|                     Data Layer                        |
|  (Typed Mock Data & Domain Interfaces)                |
+-------------------------------------------------------+
```

### Key Principles

1. **Decoupled Data Structures**: Data structure implementations (e.g. `src/ds/Graph.ts`) do NOT import React or UI components. They are pure TypeScript modules.
2. **Algorithm Testability**: Algorithms in `src/algorithms/` operate solely on Data Structures and can be verified using unit tests independently of the browser DOM.
3. **Service Layer Abstraction**: UI components interact with high-level services (`src/services/`), which internally use custom data structures and algorithms.
