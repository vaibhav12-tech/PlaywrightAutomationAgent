import fs from 'fs';
import path from 'path';
import type { Page } from '@playwright/test';
import { buildFailureAnalysis } from '../../utils/defect/failureAnalyzer';
import { buildDefectPackage } from '../../utils/defect/jiraDefectBuilder';
import type { PlaywrightWorld } from '../hooks/world';

const OUT_DIR = path.join(process.cwd(), 'reports', 'jira-defects');

/**
 * Shared evidence / defect packaging used by:
 * - Playwright Test (reporters/jira-defect-reporter.ts)
 * - Cucumber After hooks (this module)
 *
 * Writes the same reports/jira-defects/*.json shape so
 * `npm run defect:process` and the defect agent work for both runners.
 */
export async function recordCucumberFailureEvidence(input: {
  world: PlaywrightWorld;
  pickleName: string;
  pickleUri: string;
  errorMessage: string;
}): Promise<string | undefined> {
  const page: Page | undefined = input.world.page;
  if (!page) return undefined;

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const shotDir = path.join(process.cwd(), 'test-results', 'cucumber-failures');
  fs.mkdirSync(shotDir, { recursive: true });
  const safeName = input.pickleName.replace(/[^\w.-]+/g, '-').slice(0, 80);
  const screenshotPath = path.join(shotDir, `${Date.now()}-${safeName}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});

  const analysis = buildFailureAnalysis({
    testCaseName: input.pickleName,
    suiteTitle: 'Cucumber',
    playwrightFile: input.pickleUri,
    projectName: 'cucumber',
    errorMessage: input.errorMessage,
    stackTrace: input.errorMessage,
    retryCount: 0,
    browserName: 'chromium',
    artifacts: {
      screenshotPaths: fs.existsSync(screenshotPath) ? [screenshotPath] : [],
      tracePaths: [],
      videoPaths: [],
      logPaths: [],
      consoleLogs: [],
      networkLogs: [],
    },
  });

  const pkg = buildDefectPackage(analysis);
  const fileBase = `${Date.now()}-${safeName || 'cucumber-failure'}`;
  const outPath = path.join(OUT_DIR, `${fileBase}.json`);
  fs.writeFileSync(outPath, JSON.stringify(pkg, null, 2), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'latest.json'), JSON.stringify(pkg, null, 2), 'utf8');

  console.log(`[reporting] Cucumber defect package → ${outPath}`);
  return outPath;
}
