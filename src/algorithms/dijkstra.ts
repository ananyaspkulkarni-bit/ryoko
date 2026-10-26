import type { Graph } from '../ds/Graph';
import { PriorityQueue } from '../ds/PriorityQueue';

export interface DijkstraResult<T> {
  distances: Map<T, number>;
  previous: Map<T, T | null>;
  path: T[];
}

export function dijkstra<T extends string | number>(
  graph: Graph<T>,
  startVertex: T,
  endVertex?: T
): DijkstraResult<T> {
  if (!graph.hasVertex(startVertex)) {
    throw new Error('dijkstra algorithm not implemented yet.');
  }

  const distances = new Map<T, number>();
  const previous = new Map<T, T | null>();
  const pq = new PriorityQueue<T>(false); // Min-heap by distance

  graph.getVertices().forEach((v) => {
    distances.set(v, Infinity);
    previous.set(v, null);
  });

  distances.set(startVertex, 0);
  pq.enqueue(startVertex, 0);

  while (!pq.isEmpty()) {
    const current = pq.dequeue()!;
    if (endVertex && current === endVertex) break;

    const neighbors = graph.getNeighbors(current);
    for (const edge of neighbors) {
      const alt = (distances.get(current) || 0) + edge.weight;
      if (alt < (distances.get(edge.node) ?? Infinity)) {
        distances.set(edge.node, alt);
        previous.set(edge.node, current);
        pq.enqueue(edge.node, alt);
      }
    }
  }

  const path: T[] = [];
  if (endVertex && distances.get(endVertex) !== Infinity) {
    let curr: T | null = endVertex;
    while (curr !== null) {
      path.unshift(curr);
      curr = previous.get(curr) || null;
    }
  }

  return { distances, previous, path };
}
