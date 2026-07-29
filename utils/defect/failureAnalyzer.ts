import fs from 'fs';
import os from 'os';
import path from 'path';
import type {
  FailureAnalysis,
  FailureArtifacts,
  FailureEnvironment,
} from './types';
import { classifyRootCause } from './rootCauseClassifier';

function inferModule(filePath: string, title: string): string {
  const base = path.basename(filePath, path.extname(filePath));
  if (/login|session|auth/i.test(base + title)) return 'Authentication';
  if (/cart|checkout/i.test(base + title)) return 'Cart';
  if (/inventory|product|isi|footer/i.test(base + title)) return 'Products';
  if (/sauce/i.test(base + title)) return 'SauceDemo';
  return base || 'General';
}

function extractExpectedActual(errorMessage: string): {
  expected: string;
  actual: string;
} {
  const expectedMatch =
    errorMessage.match(/Expected[:\s]+(.+)/i) ||
    errorMessage.match(/expected\s+(.+)/i);
  const receivedMatch =
    errorMessage.match(/Received[:\s]+(.+)/i) ||
    errorMessage.match(/received\s+(.+)/i);

  return {
    expected: expectedMatch?.[1]?.trim() || 'Application behaves as asserted by the automated test.',
    actual:
      receivedMatch?.[1]?.trim() ||
      errorMessage.split('\n')[0]?.trim() ||
      'Unexpected failure during automated execution.',
  };
}

function buildSteps(options: {
  suiteTitle: string;
  testTitle: string;
  file: string;
  errorMessage: string;
}): string[] {
  const steps = [
    `Open the application under test (see Playwright file: ${options.file}).`,
    `Execute scenario: ${options.suiteTitle} › ${options.testTitle}.`,
    'Perform the same user actions as the automation (login / navigate / interact with UI).',
    'Observe the failure point described in Actual Result / Error Message.',
  ];

  if (/login/i.test(options.testTitle + options.errorMessage)) {
    steps.splice(1, 0, 'Login with valid test credentials used by automation.');
  }
  if (/cart/i.test(options.testTitle + options.errorMessage)) {
    steps.push('Navigate to cart and verify product persistence/state.');
  }
  return steps;
}

export function collectArtifactsFromResult(options: {
  outputDir?: string;
  attachments?: { name: string; path?: string; contentType?: string }[];
  errorContextPath?: string;
}): FailureArtifacts {
  const screenshotPaths: string[] = [];
  const tracePaths: string[] = [];
  const videoPaths: string[] = [];
  const logPaths: string[] = [];
  const consoleLogs: string[] = [];
  const networkLogs: string[] = [];

  for (const a of options.attachments ?? []) {
    if (!a.path || !fs.existsSync(a.path)) continue;
    const name = (a.name || path.basename(a.path)).toLowerCase();
    if (name.includes('screenshot') || a.contentType?.includes('image')) {
      screenshotPaths.push(a.path);
    } else if (name.includes('trace') || a.path.endsWith('.zip')) {
      tracePaths.push(a.path);
    } else if (name.includes('video') || a.path.endsWith('.webm')) {
      videoPaths.push(a.path);
    } else if (name.includes('log') || a.path.endsWith('.md') || a.path.endsWith('.txt')) {
      logPaths.push(a.path);
    }
  }

  if (options.errorContextPath && fs.existsSync(options.errorContextPath)) {
    logPaths.push(options.errorContextPath);
  }

  // Best-effort scan of test-results for related artifacts
  const resultsRoot = options.outputDir || path.join(process.cwd(), 'test-results');
  if (fs.existsSync(resultsRoot)) {
    for (const entry of walkFiles(resultsRoot)) {
      if (entry.endsWith('.png') && !screenshotPaths.includes(entry)) screenshotPaths.push(entry);
      if (entry.endsWith('.zip') && entry.includes('trace') && !tracePaths.includes(entry)) {
        tracePaths.push(entry);
      }
      if (entry.endsWith('.webm') && !videoPaths.includes(entry)) videoPaths.push(entry);
    }
  }

  return {
    screenshotPaths: unique(screenshotPaths),
    tracePaths: unique(tracePaths),
    videoPaths: unique(videoPaths),
    logPaths: unique(logPaths),
    consoleLogs,
    networkLogs,
  };
}

function walkFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

export function buildFailureAnalysis(input: {
  testCaseName: string;
  suiteTitle: string;
  playwrightFile: string;
  projectName: string;
  errorMessage: string;
  stackTrace: string;
  retryCount?: number;
  browserName?: string;
  browserVersion?: string;
  artifacts: FailureArtifacts;
}): FailureAnalysis {
  const { expected, actual } = extractExpectedActual(input.errorMessage);
  const featureModule = inferModule(input.playwrightFile, input.testCaseName);
  const decision = classifyRootCause({
    errorMessage: input.errorMessage,
    stackTrace: input.stackTrace,
    testTitle: input.testCaseName,
    retryCount: input.retryCount,
  });

  const environment: FailureEnvironment = {
    environment: (process.env.TEST_ENV || process.env.ENV || 'dev').toUpperCase(),
    browser: input.browserName || process.env.BROWSER || 'chromium',
    browserVersion: input.browserVersion || 'n/a',
    os: `${os.type()} ${os.release()}`,
    buildVersion: process.env.BUILD_VERSION || process.env.RELEASE_VERSION || 'n/a',
    frameworkVersion: readFrameworkVersion(),
    testRunId: process.env.TEST_RUN_ID || process.env.GITHUB_RUN_ID || `local-${Date.now()}`,
    executionTime: new Date().toISOString(),
  };

  const failurePoint =
    input.errorMessage.split('\n').find((l) => l.trim()) ||
    'Unknown failure point';

  return {
    testCaseName: input.testCaseName,
    testCaseId: slugId(input.testCaseName),
    featureModule,
    suiteTitle: input.suiteTitle,
    playwrightFile: input.playwrightFile,
    projectName: input.projectName,
    failurePoint,
    failureReason: decision.rationale,
    errorMessage: input.errorMessage,
    stackTrace: input.stackTrace,
    expectedResult: expected,
    actualResult: actual,
    failureStepNumber: 'Derived from Playwright stack / last failing action',
    reproducibility: decision.shouldCreateDefect
      ? 'Reproducible via automated Playwright rerun of the same test'
      : 'Not filed — classified as non-product or non-reproducible class',
    stepsToReproduce: buildSteps({
      suiteTitle: input.suiteTitle,
      testTitle: input.testCaseName,
      file: input.playwrightFile,
      errorMessage: input.errorMessage,
    }),
    environment,
    artifacts: input.artifacts,
    decision,
  };
}

function slugId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function readFrameworkVersion(): string {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
    ) as { version?: string; devDependencies?: Record<string, string> };
    return `app@${pkg.version || '1.0.0'}; @playwright/test@${pkg.devDependencies?.['@playwright/test'] || 'unknown'}`;
  } catch {
    return 'unknown';
  }
}
