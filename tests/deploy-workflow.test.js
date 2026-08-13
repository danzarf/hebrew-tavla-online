import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const WORKFLOW_PATH = '.github/workflows/deploy-trusted-stats-function.yml';
const FUNCTIONS_INDEX_PATH = 'functions/src/index.js';

function exportedFunctionNames(source) {
  return [...source.matchAll(/export const (\w+)\s*=/g)].map(match => match[1]).sort();
}

function backendFunctionsFromWorkflow(workflow) {
  const match = workflow.match(/^\s*BACKEND_FUNCTIONS:\s*(.+)$/m);
  if (!match) return [];
  return match[1]
    .split(',')
    .map(item => item.trim().replace(/^functions:/, ''))
    .filter(Boolean)
    .sort();
}

test('backend deploy workflow includes every exported production Cloud Function', () => {
  const workflow = readFileSync(WORKFLOW_PATH, 'utf8');
  const source = readFileSync(FUNCTIONS_INDEX_PATH, 'utf8');
  const exported = exportedFunctionNames(source);
  const deployed = backendFunctionsFromWorkflow(workflow);

  assert.deepEqual(deployed, exported);
  assert.match(workflow, /name:\s*Deploy Backend Functions/);
  assert.match(workflow, /firebase-tools@latest deploy --project "\$FIREBASE_PROJECT_ID" --only "\$BACKEND_FUNCTIONS" --force/);
});
