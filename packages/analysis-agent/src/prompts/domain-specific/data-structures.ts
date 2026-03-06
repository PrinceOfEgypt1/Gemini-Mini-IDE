/**
 * Data structures domain examples for code generation
 *
 * These examples demonstrate how data structure operations
 * should emit AnimationStep events for visualization.
 */

export const DATA_STRUCTURES_EXAMPLES = `
## Data Structure Implementation Examples

### Example 1: AnimationStep Interface

\`\`\`typescript
/**
 * Represents a single step in an algorithm animation.
 * Each operation on a data structure should emit one or more AnimationSteps.
 */
export interface AnimationStep {
  /** Unique ID for React keys */
  id: string;

  /** Type of operation being visualized */
  type: "compare" | "swap" | "insert" | "delete" | "access" | "sorted" | "highlight";

  /** Indices/positions involved in this step */
  indices: number[];

  /** Optional values involved (for showing what's being compared/swapped) */
  values?: unknown[];

  /** Description of what's happening (shown in UI) */
  description: string;

  /** Line number in pseudocode to highlight */
  pseudocodeLine?: number;

  /** State snapshot after this step (for replay) */
  stateSnapshot?: unknown;
}

/**
 * Generator function type for animated operations.
 * Yields steps as the operation progresses.
 */
export type AnimatedOperation<T> = Generator<AnimationStep, T, void>;
\`\`\`

### Example 2: CustomArray.sort() with AnimationSteps

\`\`\`typescript
import type { AnimationStep, AnimatedOperation } from "../types/animation";

/**
 * Custom array that emits animation steps during operations.
 */
export class CustomArray<T> {
  private data: T[] = [];
  private stepCounter = 0;

  constructor(initialData?: T[]) {
    if (initialData) {
      this.data = [...initialData];
    }
  }

  private createStep(
    type: AnimationStep["type"],
    indices: number[],
    description: string,
    pseudocodeLine?: number
  ): AnimationStep {
    return {
      id: \`step-\${++this.stepCounter}\`,
      type,
      indices,
      values: indices.map(i => this.data[i]),
      description,
      pseudocodeLine,
      stateSnapshot: [...this.data]
    };
  }

  /**
   * Bubble sort with animation steps.
   * Yields a step for each comparison and swap.
   */
  *bubbleSort(): AnimatedOperation<void> {
    const n = this.data.length;

    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        // Yield comparison step
        yield this.createStep(
          "compare",
          [j, j + 1],
          \`Comparing \${this.data[j]} and \${this.data[j + 1]}\`,
          3 // Line: if arr[j] > arr[j+1]
        );

        if (this.data[j] > this.data[j + 1]) {
          // Yield swap step
          yield this.createStep(
            "swap",
            [j, j + 1],
            \`Swapping \${this.data[j]} and \${this.data[j + 1]}\`,
            4 // Line: swap(arr[j], arr[j+1])
          );

          // Perform actual swap
          [this.data[j], this.data[j + 1]] = [this.data[j + 1], this.data[j]];
        }
      }

      // Mark element as sorted
      yield this.createStep(
        "sorted",
        [n - i - 1],
        \`Element at index \${n - i - 1} is now in its final position\`,
        6 // Line: // element sorted
      );
    }

    // Mark first element as sorted
    yield this.createStep(
      "sorted",
      [0],
      "Array is now fully sorted",
      7
    );
  }

  /**
   * Collects all steps from an animated operation.
   * Useful for pre-computing animation before playback.
   */
  collectSteps(operation: AnimatedOperation<unknown>): AnimationStep[] {
    const steps: AnimationStep[] = [];
    let result = operation.next();

    while (!result.done) {
      steps.push(result.value);
      result = operation.next();
    }

    return steps;
  }

  get values(): T[] {
    return [...this.data];
  }
}

// Usage:
// const arr = new CustomArray([5, 3, 8, 1, 2]);
// const steps = arr.collectSteps(arr.bubbleSort());
// // steps can now be used with AnimationController
\`\`\`

### Example 3: BST.insert() with AnimationSteps

\`\`\`typescript
import type { AnimationStep, AnimatedOperation } from "../types/animation";

interface BSTNode<T> {
  value: T;
  left: BSTNode<T> | null;
  right: BSTNode<T> | null;
  x?: number; // For visualization positioning
  y?: number;
}

/**
 * Binary Search Tree with animated operations.
 */
export class BST<T extends number | string> {
  private root: BSTNode<T> | null = null;
  private stepCounter = 0;

  private createStep(
    type: AnimationStep["type"],
    nodeValue: T,
    description: string,
    pseudocodeLine?: number
  ): AnimationStep {
    return {
      id: \`step-\${++this.stepCounter}\`,
      type,
      indices: [], // For trees, we use values instead of indices
      values: [nodeValue],
      description,
      pseudocodeLine,
      stateSnapshot: this.toJSON()
    };
  }

  /**
   * Insert with animation steps.
   * Yields a step for each node visited during insertion.
   */
  *insert(value: T): AnimatedOperation<void> {
    const newNode: BSTNode<T> = { value, left: null, right: null };

    if (this.root === null) {
      this.root = newNode;
      yield this.createStep(
        "insert",
        value,
        \`Inserting \${value} as root\`,
        2 // Line: root = newNode
      );
      return;
    }

    let current = this.root;

    while (true) {
      // Yield access step for current node
      yield this.createStep(
        "access",
        current.value,
        \`Visiting node \${current.value}\`,
        4 // Line: current = ...
      );

      // Yield comparison step
      yield this.createStep(
        "compare",
        current.value,
        \`Comparing \${value} with \${current.value}\`,
        5 // Line: if value < current.value
      );

      if (value < current.value) {
        if (current.left === null) {
          current.left = newNode;
          yield this.createStep(
            "insert",
            value,
            \`Inserting \${value} as left child of \${current.value}\`,
            7 // Line: current.left = newNode
          );
          return;
        }
        current = current.left;
      } else {
        if (current.right === null) {
          current.right = newNode;
          yield this.createStep(
            "insert",
            value,
            \`Inserting \${value} as right child of \${current.value}\`,
            11 // Line: current.right = newNode
          );
          return;
        }
        current = current.right;
      }
    }
  }

  private toJSON(): object {
    const serialize = (node: BSTNode<T> | null): object | null => {
      if (!node) return null;
      return {
        value: node.value,
        left: serialize(node.left),
        right: serialize(node.right)
      };
    };
    return { root: serialize(this.root) };
  }
}
\`\`\`
`;
