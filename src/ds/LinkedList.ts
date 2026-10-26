export class LinkedListNode<T> {
  value: T;
  next: LinkedListNode<T> | null = null;

  constructor(value: T) {
    this.value = value;
  }
}

export class LinkedList<T> {
  append(_value: T): void {
    throw new Error('LinkedList.append not implemented yet.');
  }

  toArray(): T[] {
    return [];
  }

  size(): number {
    return 0;
  }

  isEmpty(): boolean {
    return true;
  }
}
