interface Identifiable {
  readonly id: string;
}

class DAGraph<T extends Identifiable> {
  private readonly nodesById = new Map<string, T>();
  private readonly incomingRefs = new Map<string, Set<string>>();
  private readonly outgoingRefs = new Map<string, Set<string>>();

  addNode(node: T): DAGraph<T> {
    this.nodesById.set(node.id, node);

    return this;
  }

  getNode(id: string): T {
    return this.nodesById.get(id);
  }

  addEdge(from: T, to: T): DAGraph<T> {
    this.addNode(from);
    this.addNode(to);
    this.getIncomingRefsOf(to.id).add(from.id);
    this.getOutgoingRefsOf(from.id).add(to.id);

    if (!this.isAcyclic()) {
      throw new Error(`[${from.id}] -> [${to.id}] form a cycle`);
    }

    return this;
  }

  *topologicalSort(): Iterable<T> {
    yield* this.dfs(this.incomingRefs, this.outgoingRefs);
  }

  *roots(): Iterable<T> {
    for (const id of this.rootIds(this.incomingRefs)) {
      yield this.nodesById.get(id);
    }
  }

  *nodes(): Iterable<T> {
    for (const node of this.nodesById.values()) {
      yield node;
    }
  }

  reverse(): DAGraph<T> {
    const reverseGraph = new DAGraph<T>();

    for (const node of this.nodes()) {
      reverseGraph.addNode(node);
    }

    for (const [id, refs] of this.incomingRefs) {
      for (const refId of refs) {
        reverseGraph.addEdge(reverseGraph.getNode(id), reverseGraph.getNode(refId));
      }
    }

    return reverseGraph;
  }

  private isAcyclic(): boolean {
    const degrees = new Map<string, number>();
    this.nodesById.forEach(n => degrees.set(n.id, 0));
    this.nodesById.forEach(n =>
      this.getIncomingRefsOf(n.id).forEach(childId => {
        degrees.set(childId, degrees.get(childId) + 1);
      })
    );

    const queue = new Array<string>();
    this.nodesById.forEach(n => {
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

    return visitedNodeCount === this.nodesById.size;
  }

  private getIncomingRefsOf(nodeId: string): Set<string> {
    return getRefsOf(nodeId, this.incomingRefs);
  }

  private getOutgoingRefsOf(nodeId: string): Set<string> {
    return getRefsOf(nodeId, this.outgoingRefs);
  }

  private *dfs(forwardRefs: Map<string, Set<string>>, backwardsRefs: Map<string, Set<string>>): Iterable<T> {
    const nodes = this.nodesById;

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

    for (const root of this.rootIds(backwardsRefs)) {
      yield* push_children_recursively(root);
      yield nodes.get(root);
      visited.add(root);
    }
  }

  private *rootIds(refs: Map<string, Set<string>>): Iterable<string> {
    for (const n of this.nodesById.values()) {
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
export default DAGraph;
