export interface PriorityQueueNode<T> {
  element: T;
  priority: number;
}

export class PriorityQueue<T> {
  private items: PriorityQueueNode<T>[] = [];
  private isMaxHeap: boolean;

  constructor(isMaxHeap = true) {
    this.isMaxHeap = isMaxHeap;
  }

  enqueue(element: T, priority: number): void {
    const node: PriorityQueueNode<T> = { element, priority };
    let added = false;
    for (let i = 0; i < this.items.length; i++) {
      if (this.isMaxHeap ? priority > this.items[i].priority : priority < this.items[i].priority) {
        this.items.splice(i, 0, node);
        added = true;
        break;
      }
    }
    if (!added) {
      this.items.push(node);
    }
  }

  dequeue(): T | null {
    if (this.isEmpty()) return null;
    return this.items.shift()!.element;
  }

  peek(): T | null {
    if (this.isEmpty()) return null;
    return this.items[0].element;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }
}
