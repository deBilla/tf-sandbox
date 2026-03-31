/**
 * HCL Tokenizer — strips comments, replaces strings and heredocs with placeholders.
 * This makes downstream block extraction safe (no braces hidden in strings).
 */

export interface CleanedSource {
  text: string;
  originalLines: string[];
  placeholders: Map<string, string>;
}

const State = {
  NORMAL: 0,
  IN_STRING: 1,
  IN_SINGLE_COMMENT: 2,
  IN_MULTI_COMMENT: 3,
  IN_HEREDOC: 4,
} as const;
type State = (typeof State)[keyof typeof State];

export function tokenize(input: string): CleanedSource {
  const originalLines = input.split('\n');
  const placeholders = new Map<string, string>();
  let placeholderIdx = 0;

  let state: State = State.NORMAL;
  let result = '';
  let stringContent = '';
  let heredocDelimiter = '';
  let heredocContent = '';
  let heredocIndented = false;
  let i = 0;

  const ch = (offset = 0) => input[i + offset] ?? '';

  while (i < input.length) {
    const c = ch();
    const next = ch(1);

    switch (state) {
      case State.NORMAL:
        if (c === '"') {
          state = State.IN_STRING;
          stringContent = '';
          i++;
        } else if (c === '#' || (c === '/' && next === '/')) {
          state = State.IN_SINGLE_COMMENT;
          if (c === '/') i++; // skip second /
          i++;
        } else if (c === '/' && next === '*') {
          state = State.IN_MULTI_COMMENT;
          i += 2;
        } else if (c === '<' && next === '<') {
          // Heredoc detection
          const rest = input.slice(i);
          const heredocMatch = rest.match(/^<<(-?)\s*([A-Za-z_][A-Za-z0-9_]*)/);
          if (heredocMatch) {
            heredocIndented = heredocMatch[1] === '-';
            heredocDelimiter = heredocMatch[2];
            heredocContent = '';
            state = State.IN_HEREDOC;
            i += heredocMatch[0].length;
            // skip to next line
            while (i < input.length && input[i] !== '\n') {
              i++;
            }
            if (i < input.length) i++; // skip \n
          } else {
            result += c;
            i++;
          }
        } else {
          result += c;
          i++;
        }
        break;

      case State.IN_STRING:
        if (c === '\\' && next === '"') {
          stringContent += '\\"';
          i += 2;
        } else if (c === '\\' && next === '\\') {
          stringContent += '\\\\';
          i += 2;
        } else if (c === '"') {
          const key = `__STR_${placeholderIdx++}__`;
          placeholders.set(key, stringContent);
          result += `"${key}"`;
          state = State.NORMAL;
          i++;
        } else {
          stringContent += c;
          i++;
        }
        break;

      case State.IN_SINGLE_COMMENT:
        if (c === '\n') {
          result += '\n'; // preserve line count
          state = State.NORMAL;
          i++;
        } else {
          i++;
        }
        break;

      case State.IN_MULTI_COMMENT:
        if (c === '*' && next === '/') {
          state = State.NORMAL;
          i += 2;
        } else {
          if (c === '\n') result += '\n'; // preserve line count
          i++;
        }
        break;

      case State.IN_HEREDOC: {
        let line = '';
        while (i < input.length && input[i] !== '\n') {
          line += input[i];
          i++;
        }
        if (i < input.length) i++; // skip \n

        const trimmed = heredocIndented ? line.trimStart() : line;
        if (trimmed === heredocDelimiter) {
          const key = `__HEREDOC_${placeholderIdx++}__`;
          placeholders.set(key, heredocContent);
          result += `"${key}"`;
          state = State.NORMAL;
        } else {
          heredocContent += line + '\n';
          result += '\n'; // preserve line count
        }
        break;
      }
    }
  }

  return { text: result, originalLines, placeholders };
}

/** Restore placeholder strings to their original values */
export function restorePlaceholders(text: string, placeholders: Map<string, string>): string {
  let result = text;
  for (const [key, value] of placeholders) {
    result = result.replaceAll(key, value);
  }
  return result;
}
