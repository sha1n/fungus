interface Identifiable {
  readonly id: string;
}

class DGraph<T extends Identifiable> {
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

  isAcyclic(): boolean {
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

  *reverseTopologicalSort(): Iterable<T> {
    yield* this.dfs(this.outgoingRefs, this.incomingRefs);
  }

  *topologicalSort(): Iterable<T> {
    yield* this.dfs(this.incomingRefs, this.outgoingRefs);
  }

  *getRoots(): Iterable<T> {
    for (const id of this.roots(this.incomingRefs)) {
      yield this.nodes.get(id);
    }
  }

  *getNodes(): Iterable<T> {
    for (const node of this.nodes.values()) {
      yield node;
    }
  }

  private getIncomingRefsOf(nodeId: string): Set<string> {
    return getRefsOf(nodeId, this.incomingRefs);
  }

  private getOutgoingRefsOf(nodeId: string): Set<string> {
    return getRefsOf(nodeId, this.outgoingRefs);
  }

  private *dfs(forwardRefs: Map<string, Set<string>>, backwardsRefs: Map<string, Set<string>>): Iterable<T> {
    if (!this.isAcyclic()) {
      throw new Error('Not a DAG!');
    }
    const nodes = this.nodes;

    const visited = new Set<string>();
    const push_children_recursively = function* (parent: string): Iterable<T> {
      for (const child of forwardRefs.get(parent) || []) {
        if (!visited.has(child)) {
          yield* push_children_recursively(child);
          yield nodes.get(child);
          visited.add(child);
        }
      }
    };

    for (const root of this.roots(backwardsRefs)) {
      yield* push_children_recursively(root);
      yield nodes.get(root);
      visited.add(root);
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

export { Identifiable };
export default DGraph;
