#!/usr/bin/env node
// Build manifest.json from rule files on disk.
// Reads frontmatter (version) and header metadata (Scope, Load when, References) from each .md file.
// Usage: node scripts/build-manifest.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const ENGINES = ['unity', 'godot', 'godot-net', 'unreal-engine-5'];
const CATEGORIES = ['core', 'stack'];

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const fm = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return fm;
}

function parseHeaderMeta(content) {
  let description = '';
  const references = [];

  // Strip frontmatter first
  const body = content.replace(/^---\n[\s\S]*?\n---\n*/, '');

  for (const line of body.split('\n')) {
    const scopeMatch = line.match(/^>\s*\*\*Scope\*\*:\s*(.+)/);
    if (scopeMatch) {
      description = scopeMatch[1].trim().replace(/\.$/, '');
      continue;
    }

    const refsMatch = line.match(/^>\s*\*\*References?\*\*:\s*(.+)/);
    if (refsMatch) {
      // Extract filenames from reference paths
      const refText = refsMatch[1];
      const refFileMatches = refText.matchAll(/references\/([^\s,)]+\.md)/g);
      for (const m of refFileMatches) {
        references.push(m[1]);
      }
      continue;
    }
  }

  // Fallback: first heading as description
  if (!description) {
    const headingMatch = body.match(/^#\s+(.+)/m);
    if (headingMatch) {
      description = headingMatch[1].trim();
    }
  }

  return { description, references };
}

function buildEngineManifest(engineId) {
  const result = { core: [], stack: [] };

  for (const category of CATEGORIES) {
    const dir = path.join(ROOT, engineId, category);
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.md'))
      .sort();

    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      const fm = parseFrontmatter(content);
      const meta = parseHeaderMeta(content);
      const id = file.replace(/\.md$/, '');

      const rule = {
        id,
        description: meta.description,
        version: fm.version || '1.0.0',
      };

      if (meta.references.length > 0) {
        rule.references = meta.references;
      }

      result[category].push(rule);
    }
  }

  return result;
}

function validate(manifest) {
  let errors = 0;

  for (const [engineId, engine] of Object.entries(manifest.engines)) {
    for (const category of CATEGORIES) {
      const rules = engine[category];
      const ids = new Set();

      for (const rule of rules) {
        // ID format
        if (!/^[a-z][a-z0-9-]*$/.test(rule.id)) {
          console.error(`ERROR: ${engineId}/${category}/${rule.id} — invalid id format (must be ^[a-z][a-z0-9-]*$)`);
          errors++;
        }

        // Duplicate check
        if (ids.has(rule.id)) {
          console.error(`ERROR: ${engineId}/${category}/${rule.id} — duplicate id`);
          errors++;
        }
        ids.add(rule.id);

        // Description length
        if (rule.description.length < 10) {
          console.error(`ERROR: ${engineId}/${category}/${rule.id} — description too short (${rule.description.length} chars, min 10)`);
          errors++;
        }

        // Version format
        if (!/^\d+\.\d+\.\d+/.test(rule.version)) {
          console.error(`ERROR: ${engineId}/${category}/${rule.id} — invalid version format "${rule.version}"`);
          errors++;
        }

        // Reference files exist
        if (rule.references) {
          for (const ref of rule.references) {
            const refPath = path.join(ROOT, engineId, category, 'references', ref);
            if (!fs.existsSync(refPath)) {
              console.error(`ERROR: ${engineId}/${category}/${rule.id} — reference "${ref}" not found at ${refPath}`);
              errors++;
            }
          }
        }
      }

      // Core ∩ Stack must be empty
      if (category === 'stack') {
        const coreIds = new Set(engine.core.map(r => r.id));
        for (const rule of rules) {
          if (coreIds.has(rule.id)) {
            console.error(`ERROR: ${engineId} — "${rule.id}" exists in both core and stack`);
            errors++;
          }
        }
      }
    }
  }

  return errors;
}

// --- Main ---

const manifest = {
  schema: 1,
  generated: new Date().toISOString(),
  engines: {},
};

for (const engineId of ENGINES) {
  const engineDir = path.join(ROOT, engineId);
  if (!fs.existsSync(engineDir)) continue;

  manifest.engines[engineId] = buildEngineManifest(engineId);
}

// Validate
const errorCount = validate(manifest);

if (errorCount > 0) {
  console.error(`\n${errorCount} validation error(s) found.`);
  process.exit(1);
}

// Write manifest
const outPath = path.join(ROOT, 'manifest.json');
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

// Summary
let totalRules = 0;
for (const [engineId, engine] of Object.entries(manifest.engines)) {
  const count = engine.core.length + engine.stack.length;
  totalRules += count;
  console.log(`  ${engineId}: ${engine.core.length} core, ${engine.stack.length} stack`);
}
console.log(`\nGenerated manifest.json: ${totalRules} rules across ${Object.keys(manifest.engines).length} engines`);
