export class TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  data: unknown;

  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
    this.data = null;
  }
}

export class Trie {
  root: TrieNode;

  constructor() {
    this.root = new TrieNode();
  }

  insert(word: string, data: unknown = null): void {
    let current = this.root;
    const lower = word.toLowerCase();
    for (const char of lower) {
      if (!current.children.has(char)) {
        current.children.set(char, new TrieNode());
      }
      current = current.children.get(char)!;
    }
    current.isEndOfWord = true;
    current.data = data;
  }

  search(word: string): boolean {
    let current = this.root;
    const lower = word.toLowerCase();
    for (const char of lower) {
      if (!current.children.has(char)) return false;
      current = current.children.get(char)!;
    }
    return current.isEndOfWord;
  }

  startsWith(prefix: string): TrieNode | null {
    let current = this.root;
    const lower = prefix.toLowerCase();
    for (const char of lower) {
      if (!current.children.has(char)) return null;
      current = current.children.get(char)!;
    }
    return current;
  }
}
