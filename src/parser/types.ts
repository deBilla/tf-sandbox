export type BlockKind = 'resource' | 'variable' | 'output' | 'data' | 'locals' | 'module' | 'provider';

export interface TFBlock {
  kind: BlockKind;
  type?: string;        // e.g. "aws_instance" (resources/data only)
  name: string;         // e.g. "web"
  id: string;           // Reference-style ID: "aws_instance.web", "var.region", etc.
  provider?: string;    // e.g. "aws", "google", "azurerm"
  attributes: Record<string, string>;
  rawBody: string;
  refs: string[];
  lineStart: number;
  lineEnd: number;
}

export interface TFEdge {
  source: string;
  target: string;
  label?: string;
}

export interface ParseError {
  line: number;
  message: string;
  severity: 'warning' | 'error';
}

export interface TFGraph {
  blocks: TFBlock[];
  edges: TFEdge[];
  errors: ParseError[];
}
