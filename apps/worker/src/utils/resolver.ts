import { get } from 'lodash';

/**
 * Resolves template variables in strings and objects using double curly brace syntax.
 * Example: "Hello {{user.name}}" -> "Hello Alice"
 */
export class VariableResolver {
  /**
   * Resolve variables in a string
   */
  static resolveString(template: string, context: Record<string, any>): string {
    if (typeof template !== 'string') return template;

    return template.replace(/\{\{([\w$.-]+)\}\}/g, (match, path) => {
      const value = get(context, path.trim());
      // Return empty string for undefined to avoid "undefined" in URLs
      if (value === undefined || value === null) {
        return '';
      }
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
    });
  }

  /**
   * Deeply resolve variables in an object (e.g. headers or body)
   */
  static resolveObject(obj: any, context: Record<string, any>): any {
    if (!obj) return obj;
    
    if (typeof obj === 'string') {
      return this.resolveString(obj, context);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.resolveObject(item, context));
    }
    
    if (typeof obj === 'object') {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.resolveObject(value, context);
      }
      return result;
    }
    
    return obj;
  }
}
