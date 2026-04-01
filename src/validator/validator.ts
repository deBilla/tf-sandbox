/**
 * Validation engine — checks parsed TF blocks against provider schemas and best practices.
 */

import type { TFBlock, TFGraph } from '../parser/types';
import { getSchemaForType } from './schemas';
import { checkPolicies } from './policies';
import { isOPAReady, evaluateOPA, initOPA } from './opaEngine';

// Initialize OPA on module load
initOPA();

export type Severity = 'error' | 'warning' | 'info';

export interface ValidationResult {
  line: number;
  blockId?: string;
  severity: Severity;
  category: 'syntax' | 'schema' | 'policy' | 'reference';
  message: string;
  fix?: string;
}

export interface ValidationReport {
  results: ValidationResult[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
    schemaChecked: number;
    totalBlocks: number;
  };
}

export function validate(_code: string, graph: TFGraph): ValidationReport {
  const results: ValidationResult[] = [];

  // 1. Syntax errors from the parser (tree-sitter or regex)
  for (const err of graph.errors) {
    results.push({
      line: err.line,
      severity: err.severity,
      category: 'syntax',
      message: err.message,
    });
  }

  // 2. Schema validation
  let schemaChecked = 0;
  for (const block of graph.blocks) {
    if (block.kind === 'resource' && block.type) {
      const schemaResults = validateResource(block);
      if (schemaResults.length > 0 || getSchemaForType(block.type)) {
        schemaChecked++;
      }
      results.push(...schemaResults);
    }

    if (block.kind === 'variable') {
      const varResults = validateVariable(block);
      results.push(...varResults);
    }
  }

  // 3. Reference validation
  const refResults = validateReferences(graph);
  results.push(...refResults);

  // 4. Policy / best practices — OPA/WASM primary, TypeScript fallback
  if (isOPAReady()) {
    const opaResults = evaluateOPA(graph);
    results.push(...opaResults.map(v => ({
      line: v.line,
      blockId: v.blockId,
      severity: (v.severity || 'warning') as Severity,
      category: 'policy' as const,
      message: v.message,
      fix: v.fix,
    })));
  } else {
    // Fallback: TypeScript policy rules
    const policyResults = checkPolicies(graph);
    results.push(...policyResults.map(p => ({
      line: p.line,
      blockId: p.blockId,
      severity: p.severity as Severity,
      category: 'policy' as const,
      message: p.message,
      fix: p.fix,
    })));
  }

  // Sort by severity then line
  const severityOrder: Record<Severity, number> = { error: 0, warning: 1, info: 2 };
  results.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || a.line - b.line);

  return {
    results,
    summary: {
      errors: results.filter(r => r.severity === 'error').length,
      warnings: results.filter(r => r.severity === 'warning').length,
      infos: results.filter(r => r.severity === 'info').length,
      schemaChecked,
      totalBlocks: graph.blocks.length,
    },
  };
}

function validateResource(block: TFBlock): ValidationResult[] {
  const results: ValidationResult[] = [];
  const schema = getSchemaForType(block.type!);
  if (!schema) return results;

  // Check required attributes
  for (const [attrName, attrSchema] of Object.entries(schema.attributes)) {
    if (attrSchema.required && !block.attributes[attrName]) {
      results.push({
        line: block.lineStart,
        blockId: block.id,
        severity: 'error',
        category: 'schema',
        message: `${block.id}: missing required attribute "${attrName}"`,
        fix: `Add ${attrName} to the resource block`,
      });
    }

    // Check valid values
    if (attrSchema.validValues && block.attributes[attrName]) {
      const rawValue = block.attributes[attrName].replace(/^"/, '').replace(/"$/, '');
      // Skip interpolated values
      if (!rawValue.includes('${') && !rawValue.startsWith('var.') && !rawValue.startsWith('local.')) {
        if (!attrSchema.validValues.includes(rawValue)) {
          results.push({
            line: block.lineStart,
            blockId: block.id,
            severity: 'warning',
            category: 'schema',
            message: `${block.id}: "${attrName}" value "${rawValue}" is not a known valid value`,
            fix: `Valid values: ${attrSchema.validValues.slice(0, 5).join(', ')}`,
          });
        }
      }
    }
  }

  // Check for unknown attributes (only top-level, informational)
  for (const attrName of Object.keys(block.attributes)) {
    if (!schema.attributes[attrName] && !['tags', 'depends_on', 'count', 'for_each', 'provider', 'lifecycle'].includes(attrName)) {
      // Don't flag unknown attrs as errors — they might be nested block names or dynamic attrs
    }
  }

  return results;
}

function validateVariable(block: TFBlock): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Check if sensitive variable has a default
  if (block.attributes['sensitive'] === 'true' && block.attributes['default']) {
    results.push({
      line: block.lineStart,
      blockId: block.id,
      severity: 'warning',
      category: 'schema',
      message: `${block.id}: sensitive variable has a default value — this may expose secrets in state`,
      fix: 'Remove the default value and pass it via -var or TF_VAR_',
    });
  }

  return results;
}

function validateReferences(graph: TFGraph): ValidationResult[] {
  const results: ValidationResult[] = [];
  // Check for unused variables
  const varIds = new Set(graph.blocks.filter(b => b.kind === 'variable').map(b => b.id));
  const referencedTargets = new Set(graph.edges.map(e => e.target));
  for (const varId of varIds) {
    if (!referencedTargets.has(varId)) {
      const block = graph.blocks.find(b => b.id === varId);
      results.push({
        line: block?.lineStart ?? 0,
        blockId: varId,
        severity: 'warning',
        category: 'reference',
        message: `${varId}: defined but never referenced`,
        fix: 'Remove the variable or add a reference to it',
      });
    }
  }

  // Check for unused locals
  const localIds = new Set(graph.blocks.filter(b => b.kind === 'locals').map(b => b.id));
  for (const localId of localIds) {
    if (!referencedTargets.has(localId)) {
      const block = graph.blocks.find(b => b.id === localId);
      results.push({
        line: block?.lineStart ?? 0,
        blockId: localId,
        severity: 'warning',
        category: 'reference',
        message: `${localId}: defined but never referenced`,
        fix: 'Remove the local or add a reference to it',
      });
    }
  }

  return results;
}
