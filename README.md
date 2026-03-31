# TF Sandbox

A client-side React application that parses Terraform (`.tf`) files and renders interactive visual infrastructure diagrams. No Terraform binary, no backend -- everything runs in the browser.

**Live demo:** [https://deBilla.github.io/tf-sandbox/](https://deBilla.github.io/tf-sandbox/)

## Features

- **HCL Parser** -- Regex-based TypeScript parser that handles resources, variables, outputs, data sources, locals, modules, and providers. Supports comments, heredocs, string interpolation, and nested blocks.
- **Interactive Graph** -- React Flow canvas with dagre auto-layout (left-to-right). Draggable, zoomable, with minimap and controls.
- **Monaco Editor** -- Full code editor with custom HCL syntax highlighting, click-to-navigate between editor and graph.
- **Dependency Resolution** -- Automatically detects cross-block references (`var.x`, `module.x.output`, `resource_type.name.attr`, `local.x`, `data.type.name`) and renders animated edges.
- **Provider Grouping** -- Resources are visually grouped by provider (AWS, GCP, Azure) with color-coded borders and category icons.
- **Detail Panel** -- Click any node to see its attributes, raw HCL, and incoming/outgoing dependencies.
- **Export** -- Copy diagram to clipboard, download as PNG or SVG.
- **File Upload** -- Drag-and-drop `.tf` files or use the file picker. Multiple files supported.
- **Built-in Samples** -- Three sample configs to try instantly (Minimal, AWS VPC+EC2, GKE Cluster).
- **Warnings** -- Detects unused variables, circular dependencies, and parse errors.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 18 + Vite + TypeScript |
| Graph | React Flow (`@xyflow/react`) + dagre |
| Editor | Monaco Editor (`@monaco-editor/react`) |
| Layout | `react-resizable-panels` |
| Styling | Tailwind CSS v4 |
| State | React Context + useReducer |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and paste any `.tf` file or click a sample button.

## Project Structure

```
src/
  parser/         # HCL parsing engine
    tokenizer.ts  # Comment/string/heredoc stripping
    parser.ts     # Block extraction with brace counting
    references.ts # Dependency resolution + cycle detection
    types.ts      # TFBlock, TFEdge, TFGraph types
  graph/          # Visualization
    GraphCanvas.tsx   # React Flow canvas + export
    layout.ts         # Dagre auto-layout
    icons.ts          # Provider/category icons & colors
    nodes/            # Custom node components
  panels/         # UI panels
    EditorPanel.tsx   # Monaco editor with HCL highlighting
    DetailPanel.tsx   # Node detail inspector
    SummaryBar.tsx    # Resource counts & warnings
    FileUpload.tsx    # Drag-and-drop .tf upload
  store/          # State management
    reducer.ts    # AppState + actions
    context.tsx   # React context + debounced parsing
  utils/
    samples.ts    # Built-in sample .tf configs
```

## Deploy to GitHub Pages

```bash
npm run build
git checkout gh-pages
cp -r dist/* .
git add -A
git commit -m "deploy"
git push
git checkout main
```

## Limitations

- Parser is regex-based, targeting ~90% of real-world `.tf` files. Complex expressions, `dynamic` blocks, and advanced HCL features may not parse perfectly.
- No Terraform validation -- this is a visualization tool, not a linter.
- Single-page only -- no multi-file tabs (files are concatenated).
