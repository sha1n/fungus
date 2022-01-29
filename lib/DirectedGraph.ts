interface Identifiable {
  readonly id: string;
}

class DirectedGraph<T extends Identifiable> {
  private readonly nodes = new Map<string, T>();
  private readonly incomingRefs = new Map<string, Set<string>>();
  private readonly outgoingRefs = new Map<string, Set<string>>();

  addNode(node: T): void {
    this.nodes.set(node.id, node);
  }

  getNode(id: string): T {
    return this.nodes.get(id);
  }

  addEdge(from: T, to: T): void {
    this.addNode(from);
    this.addNode(to);
    this.getIncomingRefsOf(to.id).add(from.id);
    this.getOutgoingRefsOf(from.id).add(to.id);
  }

  isDirectAcyclic(): boolean {
    const degrees = new Map<string, number>();
    this.nodes.forEach(n => degrees.set(n.id, 0));
    this.nodes.forEach(n =>
      this.getIncomingRefsOf(n.id).forEach(childId => {
        degrees.set(childId, degrees.get(childId) + 1);
      })
    );

    const queue = new Array<string>();
    this.nodes.forEach(n => {
      if (degrees.get(n.id) === 0) {
        queue.push(n.id);
      }
    });

    let visitedNodeCount = 0;

    while (queue.length > 0) {
      const [nodeId] = queue.splice(0, 1);
      visitedNodeCount += 1;

      this.getIncomingRefsOf(nodeId).forEach(childId => {
        degrees.set(childId, degrees.get(childId) - 1);
        if (degrees.get(childId) === 0) {
          queue.push(childId);
        }
      });
    }

    return visitedNodeCount === this.nodes.size;
  }

  reverseTopologicalSort(): Array<T> {
    const values = new Array<T>();
    this.dfs(this.outgoingRefs, this.incomingRefs, n => values.push(n));
    return values;
  }

  topologicalSort(): Array<T> {
    const values = new Array<T>();
    this.dfs(this.incomingRefs, this.outgoingRefs, n => values.push(n));
    return values;
  }

  getRoots(): Array<T> {
    const roots = new Array<T>();
    for (const id of this.roots(this.incomingRefs)) {
      roots.push(this.nodes.get(id));
    }

    return roots;
  }

  getNodes(): Array<T> {
    const nodes = new Array<T>();
    for (const node of this.nodes.values()) {
      nodes.push(node);
    }

    return nodes;
  }

  private getIncomingRefsOf(nodeId: string): Set<string> {
    return getRefsOf(nodeId, this.incomingRefs);
  }

  private getOutgoingRefsOf(nodeId: string): Set<string> {
    return getRefsOf(nodeId, this.outgoingRefs);
  }

  private dfs(
    forwardRefs: Map<string, Set<string>>,
    backwardsRefs: Map<string, Set<string>>,
    visit: (n: T) => void
  ): void {
    if (!this.isDirectAcyclic()) {
      throw new Error('Not a DAG!');
    }

    const stack = new Set<string>();
    const push_children_recursively = (parent: string) => {
      for (const child of forwardRefs.get(parent) || []) {
        if (!stack.has(child)) {
          push_children_recursively(child);
          visit(this.nodes.get(child));
          stack.add(child);
        }
      }
    };

    for (const root of this.roots(backwardsRefs)) {
      push_children_recursively(root);
      visit(this.nodes.get(root));
      stack.add(root);
    }
  }

  private *roots(refs: Map<string, Set<string>>): Iterable<string> {
    for (const n of this.nodes.values()) {
      if (!refs.has(n.id) || refs.get(n.id).size === 0) {
        yield n.id;
      }
    }
  }
}

function getRefsOf(id: string, refsMap: Map<string, Set<string>>): Set<string> {
  let dependencies = refsMap.get(id);
  if (!dependencies) {
    dependencies = new Set<string>();
    refsMap.set(id, dependencies);
  }
  return dependencies;
}

export { DirectedGraph, Identifiable };
