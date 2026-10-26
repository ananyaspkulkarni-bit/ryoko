export class Stack<T> {
  push(_element: T): void {
    throw new Error('Stack.push not implemented yet.');
  }

  pop(): T | undefined {
    return undefined;
  }

  peek(): T | undefined {
    return undefined;
  }

  isEmpty(): boolean {
    return true;
  }

  size(): number {
    return 0;
  }

  toArray(): T[] {
    return [];
  }
}
