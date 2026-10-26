export interface Edge<T> {
  node: T;
  weight: number;
}

export class Graph<T extends string | number> {
  private adjacencyList: Map<T, Edge<T>[]> = new Map();

  addVertex(vertex: T): void {
    if (!this.adjacencyList.has(vertex)) {
      this.adjacencyList.set(vertex, []);
    }
  }

  addEdge(source: T, destination: T, weight: number = 1, bidirectional: boolean = true): void {
    this.addVertex(source);
    this.addVertex(destination);
    this.adjacencyList.get(source)!.push({ node: destination, weight });
    if (bidirectional) {
      this.adjacencyList.get(destination)!.push({ node: source, weight });
    }
  }

  getNeighbors(vertex: T): Edge<T>[] {
    return this.adjacencyList.get(vertex) || [];
  }

  getVertices(): T[] {
    return Array.from(this.adjacencyList.keys());
  }

  hasVertex(vertex: T): boolean {
    return this.adjacencyList.has(vertex);
  }
}
