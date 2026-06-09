import { Node, Edge } from '@stargate/database';
// @ts-ignore
import jexl from 'jexl';

export interface ValidationError {
  nodeId?: string;
  edgeId?: string;
  message: string;
}

export class WorkflowValidator {
  static validate(nodes: Node[], edges: Edge[]): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // 1. Graph Validity (Cycle Detection and Adjacency)
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();
    
    for (const node of nodes) {
      inDegree.set(node.id, 0);
      adj.set(node.id, []);
    }

    for (const edge of edges) {
      if (!inDegree.has(edge.targetNodeId)) {
        errors.push({ edgeId: edge.id, message: `Edge target node ${edge.targetNodeId} does not exist.` });
      } else {
        inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) || 0) + 1);
      }
      
      if (!adj.has(edge.sourceNodeId)) {
        errors.push({ edgeId: edge.id, message: `Edge source node ${edge.sourceNodeId} does not exist.` });
      } else {
        adj.get(edge.sourceNodeId)!.push(edge.targetNodeId);
      }
    }

    // Topological Sort for Cycle Detection
    const sorted: string[] = [];
    const q: string[] = [];
    const entries = Array.from(inDegree.entries());
    for (const [id, deg] of entries) {
      if (deg === 0) q.push(id);
    }
    
    while (q.length > 0) {
      const u = q.shift()!;
      sorted.push(u);
      for (const v of adj.get(u) || []) {
        inDegree.set(v, inDegree.get(v)! - 1);
        if (inDegree.get(v) === 0) q.push(v);
      }
    }

    if (sorted.length !== nodes.length && nodes.length > 0) {
      errors.push({ message: 'Cycle detected in workflow graph. Execution cannot proceed.' });
    }

    // Identify topologically sorted map for variable reference validation
    const topologicalIndex = new Map<string, number>();
    sorted.forEach((id, idx) => topologicalIndex.set(id, idx));

    // 2. Node Config & Syntax Validation
    for (const node of nodes) {
      const config: any = node.config || {};
      const nodeIndex = topologicalIndex.get(node.id) || 0;

      // Extract variables referenced in config
      const stringifiedConfig = JSON.stringify(config);
      const matches = Array.from(stringifiedConfig.matchAll(/\{\{([\w$.-]+)\}\}/g));
      for (const match of matches) {
        const path = match[1];
        const refNodeId = path.split('.')[0];
        
        // Ensure referenced node exists and is topologically BEFORE the current node
        if (refNodeId !== 'trigger') {
          const refIndex = topologicalIndex.get(refNodeId);
          if (refIndex === undefined) {
            errors.push({ nodeId: node.id, message: `Invalid variable reference: node '${refNodeId}' does not exist in workflow.` });
          } else if (refIndex >= nodeIndex) {
            errors.push({ nodeId: node.id, message: `Invalid variable reference: node '${refNodeId}' is not upstream of this node.` });
          }
        }
      }

      if (node.type === 'HTTP') {
        if (!config.url || typeof config.url !== 'string' || config.url.trim() === '') {
          errors.push({ nodeId: node.id, message: 'HTTP Node is missing a valid URL.' });
        }
      } else if (node.type === 'IF') {
        if (!config.expression || config.expression.trim() === '') {
          errors.push({ nodeId: node.id, message: 'IF Node is missing a condition expression.' });
        } else {
          try {
            const jexlExpr = new jexl.Jexl();
            // Jexl doesn't have a strict syntax compile check without evaluating in this version, 
            // but we can catch obvious parse errors by evaluating with empty context
            // or just creating an expression. 
            jexlExpr.createExpression(config.expression);
          } catch (err: any) {
             errors.push({ nodeId: node.id, message: `IF Node expression syntax error: ${err.message}` });
          }
        }
      }
    }

    // 3. Edge Condition Syntax Validation
    for (const edge of edges) {
      if (edge.condition && edge.condition.trim() !== '') {
        try {
          const jexlExpr = new jexl.Jexl();
          // Avoid evaluating, just parse
          jexlExpr.createExpression(edge.condition);
        } catch (err: any) {
          errors.push({ edgeId: edge.id, message: `Edge condition syntax error: ${err.message}` });
        }
      }
    }

    return errors;
  }
}
