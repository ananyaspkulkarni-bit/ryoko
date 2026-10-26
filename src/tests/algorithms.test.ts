import { describe, it, expect } from 'vitest';
import { breadthFirstSearch, depthFirstSearch, dijkstra } from '../algorithms';
import { Graph } from '../ds/Graph';

describe('Algorithms Infrastructure Suite', () => {
  it('Algorithms functions should be defined as stubs', () => {
    expect(breadthFirstSearch).toBeDefined();
    expect(depthFirstSearch).toBeDefined();
    expect(dijkstra).toBeDefined();
  });

  it('Dijkstra stub should throw not implemented error', () => {
    const graph = new Graph<string>();
    expect(() => dijkstra(graph, 'A', 'B')).toThrow('dijkstra algorithm not implemented yet.');
  });
});
