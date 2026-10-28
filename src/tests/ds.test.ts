import { describe, it, expect } from 'vitest';
import { Graph, Trie, PriorityQueue, LinkedList, HashMap, Stack, Queue, DestinationMap, destinationMap } from '../ds';
import { getDestinationData } from '../data/destinations';
import type { Destination } from '../types';

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

  describe('Stack Data Structure Suite', () => {
    it('Stack class should instantiate cleanly with empty state', () => {
      const stack = new Stack<string>();
      expect(stack).toBeInstanceOf(Stack);
      expect(stack.isEmpty()).toBe(true);
      expect(stack.size()).toBe(0);
      expect(stack.peek()).toBeUndefined();
      expect(stack.pop()).toBeUndefined();
    });

    it('push and peek should report top element without removing it', () => {
      const stack = new Stack<string>();
      stack.push('Paris-Day-1');
      expect(stack.isEmpty()).toBe(false);
      expect(stack.size()).toBe(1);
      expect(stack.peek()).toBe('Paris-Day-1');

      stack.push('Paris-Day-2');
      expect(stack.size()).toBe(2);
      expect(stack.peek()).toBe('Paris-Day-2');
      // peek does not remove the element
      expect(stack.size()).toBe(2);
    });

    it('pop should remove and return elements in LIFO (Last In, First Out) order', () => {
      const stack = new Stack<number>();
      stack.push(10);
      stack.push(20);
      stack.push(30);

      expect(stack.size()).toBe(3);
      expect(stack.pop()).toBe(30);
      expect(stack.size()).toBe(2);
      expect(stack.peek()).toBe(20);

      expect(stack.pop()).toBe(20);
      expect(stack.pop()).toBe(10);
      expect(stack.isEmpty()).toBe(true);
      expect(stack.size()).toBe(0);
    });

    it('pop and peek on empty stack should return undefined gracefully without throwing', () => {
      const stack = new Stack<{ id: string }>();
      expect(stack.isEmpty()).toBe(true);
      expect(stack.pop()).toBeUndefined();
      expect(stack.peek()).toBeUndefined();
      expect(stack.size()).toBe(0);

      // Push then pop to empty
      stack.push({ id: 'plan-1' });
      expect(stack.pop()).toEqual({ id: 'plan-1' });
      expect(stack.pop()).toBeUndefined();
      expect(stack.peek()).toBeUndefined();
      expect(stack.isEmpty()).toBe(true);
    });

    it('toArray and clear should function properly', () => {
      const stack = new Stack<string>(['alpha', 'beta']);
      expect(stack.size()).toBe(2);
      stack.push('gamma');

      expect(stack.toArray()).toEqual(['alpha', 'beta', 'gamma']);

      stack.clear();
      expect(stack.isEmpty()).toBe(true);
      expect(stack.size()).toBe(0);
      expect(stack.toArray()).toEqual([]);
    });
  });

  describe('DestinationMap (Hash Map) Data Structure Suite', () => {
    const mockParis: Destination = {
      id: 'paris',
      name: 'Paris',
      primaryCity: 'Paris',
      country: 'France',
      countryCode: 'FR',
      region: 'Europe',
      coordinates: { lat: 48.8566, lng: 2.3522 },
      description: 'City of light',
      category: 'cultural',
      tags: ['art', 'romance'],
      rating: 4.9,
    };

    const mockTokyo: Destination = {
      id: 'tokyo',
      name: 'Tokyo',
      primaryCity: 'Tokyo',
      country: 'Japan',
      countryCode: 'JP',
      region: 'Asia',
      coordinates: { lat: 35.6762, lng: 139.6503 },
      description: 'Modern metropolis',
      category: 'urban',
      tags: ['neon', 'food'],
      rating: 4.9,
    };

    it('instantiates with empty state and reports zero size', () => {
      const map = new DestinationMap();
      expect(map).toBeInstanceOf(DestinationMap);
      expect(map.size()).toBe(0);
      expect(map.get('paris')).toBeUndefined();
      expect(map.has('paris')).toBe(false);
    });

    it('normalizes search keys consistently including case and surrounding whitespace', () => {
      const map = new DestinationMap();
      expect(map.normalizeKey('Paris')).toBe('paris');
      expect(map.normalizeKey('  paris  ')).toBe('paris');
      expect(map.normalizeKey(' PARIS ')).toBe('paris');
      expect(map.normalizeKey('\tParis\n')).toBe('paris');
      expect(map.normalizeKey('')).toBe('');
    });

    it('demonstration: searching for Paris, paris, or  PARIS  resolves consistently', () => {
      const map = new DestinationMap();
      map.set('paris', mockParis);

      // Demonstrates O(1) hash lookup with case/whitespace variations
      const query1 = map.get('Paris');
      const query2 = map.get('paris');
      const query3 = map.get(' PARIS ');
      const query4 = map.get('\tparis\n');

      expect(query1).toBeDefined();
      expect(query1).toBe(mockParis);
      expect(query2).toBe(mockParis);
      expect(query3).toBe(mockParis);
      expect(query4).toBe(mockParis);
      expect(query1?.id).toBe('paris');
    });

    it('has() performs O(1) existence checks with normalization', () => {
      const map = new DestinationMap();
      map.set('tokyo', mockTokyo);

      expect(map.has('tokyo')).toBe(true);
      expect(map.has('TOKYO')).toBe(true);
      expect(map.has('  Tokyo  ')).toBe(true);
      expect(map.has('kyoto')).toBe(false);
    });

    it('handles missing destinations gracefully without throwing', () => {
      const map = new DestinationMap([mockParis]);
      expect(map.get('Atlantis')).toBeUndefined();
      expect(map.get('non-existent-id')).toBeUndefined();
      expect(map.has('Atlantis')).toBe(false);
    });

    it('delete and clear remove entries properly', () => {
      const map = new DestinationMap();
      map.set('paris', mockParis);
      map.set('tokyo', mockTokyo);
      expect(map.size()).toBe(2);

      const deleted = map.delete('PARIS');
      expect(deleted).toBe(true);
      expect(map.has('paris')).toBe(false);
      expect(map.size()).toBe(1);

      map.clear();
      expect(map.size()).toBe(0);
      expect(map.has('tokyo')).toBe(false);
    });

    it('registerDestination creates mappings for id, name, city, country, code, and aliases', () => {
      const map = new DestinationMap();
      map.registerDestination(mockParis, ['The City of Light', 'Paname']);

      expect(map.get('paris')).toBe(mockParis);
      expect(map.get('Paris')).toBe(mockParis);
      expect(map.get('France')).toBe(mockParis);
      expect(map.get('FR')).toBe(mockParis);
      expect(map.get('The City of Light')).toBe(mockParis);
      expect(map.get('paname')).toBe(mockParis);
    });

    it('getAllUnique returns unique destinations deduplicated by id', () => {
      const map = new DestinationMap();
      map.registerDestination(mockParis, ['Paname', 'City of Light']);
      map.registerDestination(mockTokyo, ['Edo']);

      // Multiple keys point to mockParis, but getAllUnique should contain mockParis exactly once
      const unique = map.getAllUnique();
      expect(unique.length).toBe(2);
      const ids = unique.map((d) => d.id).sort();
      expect(ids).toEqual(['paris', 'tokyo']);
    });

    it('avoids duplicate records when populated with multiple destination records', () => {
      const map = new DestinationMap();
      map.populate([mockParis, mockParis, mockTokyo]);
      const unique = map.getAllUnique();
      expect(unique.length).toBe(2);
    });

    it('application singleton destinationMap is populated and provides O(1) lookup', () => {
      expect(destinationMap.size()).toBeGreaterThan(0);
      expect(destinationMap.has('paris')).toBe(true);
      expect(destinationMap.has('cairo')).toBe(true);
      expect(destinationMap.has('tokyo')).toBe(true);

      const paris = destinationMap.get(' PARIS ');
      expect(paris).toBeDefined();
      expect(paris?.id).toBe('paris');
      expect(paris?.country).toBe('France');
    });

    it('getDestinationData integrates destinationMap and resolves case/whitespace variations', () => {
      const res1 = getDestinationData('Paris');
      const res2 = getDestinationData('paris');
      const res3 = getDestinationData(' PARIS ');

      expect(res1.id).toBe('paris');
      expect(res2.id).toBe('paris');
      expect(res3.id).toBe('paris');
      expect(res1).toBe(res2);
      expect(res2).toBe(res3);
    });
  });

  describe('Queue (FIFO) Data Structure Suite', () => {
    it('Queue class should instantiate cleanly with empty state', () => {
      const queue = new Queue<string>();
      expect(queue).toBeInstanceOf(Queue);
      expect(queue.isEmpty()).toBe(true);
      expect(queue.size()).toBe(0);
      expect(queue.peek()).toBeUndefined();
      expect(queue.dequeue()).toBeUndefined();
    });

    it('enqueue and dequeue should process elements in strict FIFO (First In, First Out) order', () => {
      const queue = new Queue<string>();
      queue.enqueue('Request-1-Paris');
      queue.enqueue('Request-2-Tokyo');
      queue.enqueue('Request-3-Cairo');

      expect(queue.size()).toBe(3);
      expect(queue.isEmpty()).toBe(false);

      // First In, First Out
      expect(queue.dequeue()).toBe('Request-1-Paris');
      expect(queue.size()).toBe(2);

      expect(queue.dequeue()).toBe('Request-2-Tokyo');
      expect(queue.size()).toBe(1);

      expect(queue.dequeue()).toBe('Request-3-Cairo');
      expect(queue.size()).toBe(0);
      expect(queue.isEmpty()).toBe(true);
    });

    it('peek should return the front element without removing it', () => {
      const queue = new Queue<number>();
      queue.enqueue(100);
      queue.enqueue(200);

      expect(queue.size()).toBe(2);
      expect(queue.peek()).toBe(100);
      // Peek must not remove item or change size
      expect(queue.size()).toBe(2);
      expect(queue.peek()).toBe(100);

      queue.dequeue();
      expect(queue.peek()).toBe(200);
    });

    it('dequeue and peek on empty queue should return undefined gracefully', () => {
      const queue = new Queue<number>();
      expect(queue.isEmpty()).toBe(true);
      expect(queue.dequeue()).toBeUndefined();
      expect(queue.peek()).toBeUndefined();
      expect(queue.size()).toBe(0);

      queue.enqueue(42);
      expect(queue.dequeue()).toBe(42);
      // Now empty again
      expect(queue.dequeue()).toBeUndefined();
      expect(queue.peek()).toBeUndefined();
      expect(queue.isEmpty()).toBe(true);
    });

    it('size tracks accurately across multiple enqueue and dequeue cycles', () => {
      const queue = new Queue<number>();
      expect(queue.size()).toBe(0);

      for (let i = 1; i <= 5; i++) {
        queue.enqueue(i);
        expect(queue.size()).toBe(i);
      }

      for (let i = 5; i >= 1; i--) {
        expect(queue.size()).toBe(i);
        queue.dequeue();
      }
      expect(queue.size()).toBe(0);
      expect(queue.isEmpty()).toBe(true);
    });

    it('clear should reset head, tail, and size immediately', () => {
      const queue = new Queue<string>(['item1', 'item2', 'item3']);
      expect(queue.size()).toBe(3);
      expect(queue.isEmpty()).toBe(false);

      queue.clear();
      expect(queue.size()).toBe(0);
      expect(queue.isEmpty()).toBe(true);
      expect(queue.peek()).toBeUndefined();
      expect(queue.dequeue()).toBeUndefined();

      // Enqueue still works after clear
      queue.enqueue('item4');
      expect(queue.size()).toBe(1);
      expect(queue.peek()).toBe('item4');
      expect(queue.dequeue()).toBe('item4');
    });

    it('toArray returns elements in FIFO order from head to tail', () => {
      const queue = new Queue<string>(['first', 'second', 'third']);
      expect(queue.toArray()).toEqual(['first', 'second', 'third']);

      queue.dequeue();
      expect(queue.toArray()).toEqual(['second', 'third']);
    });

    it('demonstrates O(1) performance without O(n) array shift overhead on large collections', () => {
      const queue = new Queue<number>();
      const count = 1000;

      for (let i = 0; i < count; i++) {
        queue.enqueue(i);
      }
      expect(queue.size()).toBe(count);

      for (let i = 0; i < count; i++) {
        const item = queue.dequeue();
        expect(item).toBe(i);
      }
      expect(queue.isEmpty()).toBe(true);
      expect(queue.size()).toBe(0);
    });
  });
});

