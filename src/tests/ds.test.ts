import { describe, it, expect } from 'vitest';
import { Graph, Trie, PriorityQueue, LinkedList, HashMap, Stack } from '../ds';

describe('Data Structures Scaffolding Suite', () => {
  it('Graph class should instantiate cleanly', () => {
    const graph = new Graph<string>();
    expect(graph).toBeInstanceOf(Graph);
    expect(graph.hasVertex('Tokyo')).toBe(false);
  });

  it('Trie class should instantiate cleanly', () => {
    const trie = new Trie();
    expect(trie).toBeInstanceOf(Trie);
    expect(trie.search('tokyo')).toBe(false);
  });

  it('PriorityQueue class should instantiate cleanly', () => {
    const pq = new PriorityQueue<string>();
    expect(pq).toBeInstanceOf(PriorityQueue);
    expect(pq.isEmpty()).toBe(true);
    expect(pq.size()).toBe(0);
  });

  it('LinkedList class should instantiate cleanly', () => {
    const list = new LinkedList<number>();
    expect(list).toBeInstanceOf(LinkedList);
    expect(list.isEmpty()).toBe(true);
    expect(list.size()).toBe(0);
  });

  it('HashMap class should instantiate cleanly', () => {
    const map = new HashMap<string, number>();
    expect(map).toBeInstanceOf(HashMap);
    expect(map.size()).toBe(0);
  });

  it('Stack class should instantiate cleanly', () => {
    const stack = new Stack<string>();
    expect(stack).toBeInstanceOf(Stack);
    expect(stack.isEmpty()).toBe(true);
    expect(stack.size()).toBe(0);
  });
});
