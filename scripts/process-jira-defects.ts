/**
 * Process pending defect packages under reports/jira-defects/.
 *
 * Modes:
 *  - Default: print package summary for Cursor MCP agent
 *  - JIRA_AUTO_CREATE=true with JIRA_EMAIL + JIRA_API_TOKEN: create via REST
 *
 * Usage:
 *   npx ts-node scripts/process-jira-defects.ts
 *   npx ts-node scripts/process-jira-defects.ts reports/jira-defects/latest.json
 */

import fs from 'fs';
import path from 'path';
import type { DefectPackage } from '../utils/defect/types';

const dir = path.join(process.cwd(), 'reports', 'jira-defects');
const target = process.argv[2] || path.join(dir, 'latest.json');

if (!fs.existsSync(target)) {
  console.error(`No defect package found at ${target}`);
  console.error('Run Playwright tests first; failures produce packages via jira-defect-reporter.');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(target, 'utf-8')) as DefectPackage;

console.log('=== Playwright → Jira Defect Package ===');
console.log(`Status      : ${pkg.status}`);
console.log(`Root Cause  : ${pkg.analysis.decision.rootCause}`);
console.log(`Create Bug? : ${pkg.analysis.decision.shouldCreateDefect}`);
console.log(`Rationale   : ${pkg.analysis.decision.rationale}`);
console.log(`Test        : ${pkg.analysis.testCaseName}`);
console.log(`File        : ${pkg.analysis.playwrightFile}`);
console.log(`Module      : ${pkg.analysis.featureModule}`);

if (!pkg.analysis.decision.shouldCreateDefect || !pkg.jira) {
  console.log('\nNo Jira defect will be created (non-product / non-reproducible class).');
  process.exit(0);
}

console.log('\n--- Jira Payload ---');
console.log(`Project  : ${pkg.jira.projectKey}`);
console.log(`Type     : ${pkg.jira.issueType}`);
console.log(`Priority : ${pkg.jira.priority}`);
console.log(`Labels   : ${pkg.jira.labels.join(', ')}`);
console.log(`Component: ${pkg.jira.component}`);
console.log(`Summary  : ${pkg.jira.summary}`);
console.log(`Duplicate JQL:\n${pkg.jira.duplicateSearchJql}`);
console.log('\nArtifacts:');
for (const p of [
  ...pkg.analysis.artifacts.screenshotPaths,
  ...pkg.analysis.artifacts.tracePaths,
  ...pkg.analysis.artifacts.videoPaths,
  ...pkg.analysis.artifacts.logPaths,
]) {
  console.log(` - ${p}`);
}

console.log('\nNext step (Cursor):');
console.log(
  '@playwright-jira-defect-agent Create Jira defect from reports/jira-defects/latest.json'
);
console.log('\nDescription preview (first 40 lines):');
console.log(pkg.jira.descriptionMarkdown.split('\n').slice(0, 40).join('\n'));
