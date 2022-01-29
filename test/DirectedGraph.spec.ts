import { DirectedGraph, Identifiable } from '../lib/DirectedGraph';
import 'jest-extended';
import { v4 as uuid } from 'uuid';

describe('DirectedGraph', () => {
  describe('isDirectAcyclic', function () {
    test('should consider an empty graph a DAG', () => {
      const dgraph = new DirectedGraph();

      expect(dgraph.isDirectAcyclic()).toBeTrue();
    });

    test('should consider a single node graph a DAG', () => {
      const dgraph = new DirectedGraph();
      dgraph.addNode(aNode());

      expect(dgraph.isDirectAcyclic()).toBeTrue();
    });

    test('should consider a disconnected graph a DAG', () => {
      const dgraph = new DirectedGraph();
      dgraph.addNode(aNode());
      dgraph.addNode(aNode());

      expect(dgraph.isDirectAcyclic()).toBeTrue();
    });

    test('should consider a connected DAP graph a DAG', () => {
      const dgraph = new DirectedGraph();
      const node1 = aNode();
      const node2 = aNode();
      const node3 = aNode();
      dgraph.addEdge(node1, node2);
      dgraph.addEdge(node1, node3);

      expect(dgraph.isDirectAcyclic()).toBeTrue();
    });

    test('should detect a direct cycle', () => {
      const dgraph = new DirectedGraph();
      const node1 = aNode();
      const node2 = aNode();
      dgraph.addEdge(node1, node2);
      dgraph.addEdge(node2, node1);

      expect(dgraph.isDirectAcyclic()).toBeFalse();
    });

    test('should detect an indirect cycle', () => {
      const dgraph = new DirectedGraph();
      const node1 = aNode();
      const node2 = aNode();
      const node3 = aNode();
      const node4 = aNode();
      const node5 = aNode();
      dgraph.addEdge(node1, node2);
      dgraph.addEdge(node2, node3);
      dgraph.addEdge(node3, node4);
      dgraph.addEdge(node4, node5);
      dgraph.addEdge(node5, node2);

      expect(dgraph.isDirectAcyclic()).toBeFalse();
    });
  });

  describe('getRoots', () => {
    test('should return the nodes from which forward traversal should  start', () => {
      const dgraph = new DirectedGraph();
      const node0 = aNode();
      const node1 = aNode();
      const node2 = aNode();
      const node3 = aNode();
      const node4 = aNode();
      const node5 = aNode();
      dgraph.addNode(node0); // node0
      dgraph.addEdge(node1, node2); // node1 -> node2
      dgraph.addEdge(node1, node3); // node1 -> node3
      dgraph.addEdge(node2, node3); // node2 -> node3
      dgraph.addEdge(node2, node4); // node2 -> node4
      dgraph.addEdge(node3, node4); // node3 -> node4
      dgraph.addEdge(node4, node5); // node4 -> node5

      const expectedRoots = [node0, node1];

      expect(dgraph.getRoots()).toIncludeSameMembers(expectedRoots);
    });
  });

  describe('topologicalSort', () => {
    test('should return empty iterable for an empty graph', () => {
      const dgraph = new DirectedGraph();

      expect(dgraph.topologicalSort()).toBeEmpty();
    });

    test('should return a single node for a single node graph', () => {
      const dgraph = new DirectedGraph();
      const theNode = aNode();
      dgraph.addNode(theNode);

      const expected = [theNode];

      expect(dgraph.topologicalSort()).toEqual(expected);
    });

    test('should fail when there is a cycle', () => {
      const dgraph = new DirectedGraph();
      const n1 = aNode();
      const n2 = aNode();
      dgraph.addEdge(n1, n2);
      dgraph.addEdge(n2, n1);

      expect(() => dgraph.topologicalSort()).toThrowError();
    });

    test('should follow edges directions', () => {
      const dgraph = new DirectedGraph();
      const node1 = aNode();
      const node2 = aNode();
      const node3 = aNode();
      const node4 = aNode();
      const node5 = aNode();
      dgraph.addEdge(node1, node2); // node1 -> node2
      dgraph.addEdge(node1, node3); // node1 -> node3
      dgraph.addEdge(node2, node3); // node2 -> node3
      dgraph.addEdge(node2, node4); // node2 -> node4
      dgraph.addEdge(node3, node4); // node3 -> node4
      dgraph.addEdge(node4, node5); // node4 -> node5

      const expected = [node1, node2, node3, node4, node5];

      expect(dgraph.topologicalSort()).toEqual(expected);
    });
  });

  describe('reverseTopologicalSort', () => {
    test('should return empty iterable for an empty graph', () => {
      const dgraph = new DirectedGraph();

      expect(dgraph.reverseTopologicalSort()).toBeEmpty();
    });

    test('should return a single node for a single node graph', () => {
      const dgraph = new DirectedGraph();
      const theNode = aNode();
      dgraph.addNode(theNode);

      const expected = [theNode];

      expect(dgraph.reverseTopologicalSort()).toEqual(expected);
    });

    test('should follow reverse edges directions', () => {
      const dgraph = new DirectedGraph();
      const node1 = aNode();
      const node2 = aNode();
      const node3 = aNode();
      const node4 = aNode();
      const node5 = aNode();
      dgraph.addEdge(node1, node2); // node1 -> node2
      dgraph.addEdge(node1, node3); // node1 -> node3
      dgraph.addEdge(node2, node3); // node2 -> node3
      dgraph.addEdge(node2, node4); // node2 -> node4
      dgraph.addEdge(node3, node4); // node3 -> node4
      dgraph.addEdge(node4, node5); // node4 -> node5

      const expected = [node5, node4, node3, node2, node1];

      expect(dgraph.reverseTopologicalSort()).toEqual(expected);
    });
  });
});

function aNode(): Identifiable {
  return { id: uuid() };
}
