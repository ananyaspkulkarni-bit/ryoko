/**
 * Internal linked-list node for the FIFO Queue.
 */
class QueueNode<T> {
  value: T;
  next: QueueNode<T> | null = null;

  constructor(value: T) {
    this.value = value;
  }
}

/**
 * Generic FIFO (First In, First Out) Queue data structure.
 *
 * Implementation:
 * Singly-linked list with head (front) and tail (back) references.
 *
 * Time Complexities:
 * - enqueue(item): O(1) worst-case (appends node to tail reference)
 * - dequeue():     O(1) worst-case (detaches and returns node from head reference)
 * - peek():        O(1) worst-case (reads head value without removal)
 * - isEmpty():     O(1) worst-case (checks whether size === 0)
 * - size():        O(1) worst-case (returns tracked length counter)
 * - clear():       O(1) worst-case (resets head, tail, and size)
 * - toArray():     O(n) (traverses linked list from head to tail)
 *
 * Avoids Array.prototype.shift() which incurs an O(n) element reallocation penalty
 * on every dequeue operation.
 */
export class Queue<T> {
  private head: QueueNode<T> | null = null;
  private tail: QueueNode<T> | null = null;
  private _size = 0;

  constructor(initialItems?: T[]) {
    if (initialItems && Array.isArray(initialItems)) {
      for (const item of initialItems) {
        this.enqueue(item);
      }
    }
  }

  /**
   * Adds an element to the back of the queue (tail).
   * Time Complexity: O(1)
   */
  public enqueue(item: T): void {
    const node = new QueueNode(item);
    if (!this.tail) {
      this.head = node;
      this.tail = node;
    } else {
      this.tail.next = node;
      this.tail = node;
    }
    this._size++;
  }

  /**
   * Removes and returns the element at the front of the queue (head).
   * Returns undefined if the queue is empty.
   * Time Complexity: O(1)
   */
  public dequeue(): T | undefined {
    if (!this.head) {
      return undefined;
    }
    const val = this.head.value;
    this.head = this.head.next;
    if (!this.head) {
      this.tail = null;
    }
    this._size--;
    return val;
  }

  /**
   * Returns the element at the front of the queue without removing it.
   * Returns undefined if the queue is empty.
   * Time Complexity: O(1)
   */
  public peek(): T | undefined {
    return this.head ? this.head.value : undefined;
  }

  /**
   * Checks whether the queue contains no elements.
   * Time Complexity: O(1)
   */
  public isEmpty(): boolean {
    return this._size === 0;
  }

  /**
   * Returns the number of elements currently in the queue.
   * Time Complexity: O(1)
   */
  public size(): number {
    return this._size;
  }

  /**
   * Removes all elements from the queue.
   * Time Complexity: O(1)
   */
  public clear(): void {
    this.head = null;
    this.tail = null;
    this._size = 0;
  }

  /**
   * Returns all items as an array in FIFO order (head to tail).
   * Time Complexity: O(n)
   */
  public toArray(): T[] {
    const result: T[] = [];
    let current = this.head;
    while (current) {
      result.push(current.value);
      current = current.next;
    }
    return result;
  }
}
