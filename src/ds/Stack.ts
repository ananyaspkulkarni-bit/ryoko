/**
 * Generic Stack (LIFO — Last In, First Out) data structure.
 * Supports push, pop, peek, isEmpty, size, clear, and toArray.
 */
export class Stack<T> {
  private items: T[] = [];

  constructor(initialItems?: T[]) {
    if (initialItems && Array.isArray(initialItems)) {
      this.items = [...initialItems];
    }
  }

  /**
   * Pushes an element onto the top of the stack.
   */
  push(element: T): void {
    this.items.push(element);
  }

  /**
   * Removes and returns the top element from the stack.
   * Returns undefined if the stack is empty.
   */
  pop(): T | undefined {
    return this.items.pop();
  }

  /**
   * Returns the top element without removing it.
   * Returns undefined if the stack is empty.
   */
  peek(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    return this.items[this.items.length - 1];
  }

  /**
   * Checks whether the stack is empty.
   */
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /**
   * Returns the number of elements in the stack.
   */
  size(): number {
    return this.items.length;
  }

  /**
   * Returns a copy of the elements as an array from bottom to top.
   */
  toArray(): T[] {
    return [...this.items];
  }

  /**
   * Removes all elements from the stack.
   */
  clear(): void {
    this.items = [];
  }
}

