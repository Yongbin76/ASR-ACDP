class Node {
  constructor() {
    this.next = new Map();
    this.fail = null;
    this.outputs = [];
  }
}

class AhoCorasick {
  constructor() {
    this.root = new Node();
  }

  add(pattern, payload) {
    if (!pattern) {
      return;
    }
    let node = this.root;
    for (const ch of pattern) {
      if (!node.next.has(ch)) {
        node.next.set(ch, new Node());
      }
      node = node.next.get(ch);
    }
    node.outputs.push(payload);
  }

  build() {
    const queue = [];
    for (const child of this.root.next.values()) {
      child.fail = this.root;
      queue.push(child);
    }

    while (queue.length > 0) {
      const current = queue.shift();
      for (const [ch, nextNode] of current.next.entries()) {
        let fail = current.fail;
        while (fail && !fail.next.has(ch)) {
          fail = fail.fail;
        }
        nextNode.fail = fail ? fail.next.get(ch) : this.root;
        nextNode.outputs = nextNode.outputs.concat(nextNode.fail.outputs);
        queue.push(nextNode);
      }
    }
  }

  findAll(text) {
    const results = [];
    let node = this.root;
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      while (node !== this.root && !node.next.has(ch)) {
        node = node.fail || this.root;
      }
      if (node.next.has(ch)) {
        node = node.next.get(ch);
      } else {
        node = this.root;
      }
      for (const payload of node.outputs) {
        results.push({
          start: i - payload.pattern.length + 1,
          end: i,
          payload,
        });
      }
    }
    return results;
  }
}

module.exports = {
  AhoCorasick,
};