import fs from 'fs';
import path from 'path';
import type { DefectPackage, FailureAnalysis } from './types';

export type DefectConfig = {
  cloudId: string;
  projectKey: string;
  siteBaseUrl: string;
  defaultPriority: string;
  labels: string[];
  reporterDisplayName: string;
};

export function loadDefectConfig(): DefectConfig {
  let fileCfg: Partial<DefectConfig> = {};
  try {
    const cfgPath = path.join(process.cwd(), 'config', 'defect.config.json');
    if (fs.existsSync(cfgPath)) {
      fileCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8')) as Partial<DefectConfig>;
    }
  } catch {
    // optional config file
  }

  return {
    cloudId:
      process.env.JIRA_CLOUD_ID || fileCfg.cloudId || 'revance-it.atlassian.net',
    projectKey: process.env.JIRA_PROJECT_KEY || fileCfg.projectKey || 'BL10',
    siteBaseUrl:
      process.env.JIRA_BASE_URL ||
      fileCfg.siteBaseUrl ||
      'https://revance-it.atlassian.net',
    defaultPriority:
      process.env.JIRA_DEFECT_PRIORITY || fileCfg.defaultPriority || 'Medium',
    labels: fileCfg.labels || ['AutomationFailure', 'Playwright'],
    reporterDisplayName: fileCfg.reporterDisplayName || 'Automation Bot',
  };
}

export function buildDuplicateJql(projectKey: string, analysis: FailureAnalysis): string {
  const module = analysis.featureModule.replace(/"/g, '');
  const snippet = analysis.testCaseName.replace(/"/g, '').slice(0, 60);
  return (
    `project = ${projectKey} AND issuetype = Bug AND resolution = Unresolved ` +
    `AND labels in (AutomationFailure, Playwright) ` +
    `AND (summary ~ "${snippet}" OR summary ~ "${module}") ` +
    `ORDER BY updated DESC`
  );
}

export function buildDefectSummary(analysis: FailureAnalysis): string {
  const env = analysis.environment.environment;
  const module = analysis.featureModule;
  const brief = analysis.failurePoint.replace(/\s+/g, ' ').slice(0, 80);
  return `[${env}] [${module}] - Test Case Failure - ${brief}`;
}

/** Markdown description for Atlassian MCP contentFormat=markdown */
export function buildDescriptionMarkdown(analysis: FailureAnalysis): string {
  const a = analysis;
  const art = a.artifacts;
  return [
    '## Defect Summary',
    a.decision.rationale,
    '',
    '## Environment',
    `* Environment: ${a.environment.environment}`,
    `* Browser: ${a.environment.browser}`,
    `* Browser Version: ${a.environment.browserVersion}`,
    `* OS: ${a.environment.os}`,
    `* Build Version: ${a.environment.buildVersion}`,
    `* Automation Framework Version: ${a.environment.frameworkVersion}`,
    `* Test Run ID: ${a.environment.testRunId}`,
    `* Execution Time: ${a.environment.executionTime}`,
    '',
    '## Test Information',
    `* Test Case ID: ${a.testCaseId}`,
    `* Test Case Name: ${a.testCaseName}`,
    `* Automation Suite: ${a.suiteTitle}`,
    `* Playwright Test File: ${a.playwrightFile}`,
    `* Playwright Project: ${a.projectName}`,
    `* Feature/Module: ${a.featureModule}`,
    `* Failure Step: ${a.failureStepNumber}`,
    `* Reproducibility: ${a.reproducibility}`,
    '',
    '## Steps To Reproduce',
    ...a.stepsToReproduce.map((s, i) => `${i + 1}. ${s}`),
    '',
    '## Expected Result',
    a.expectedResult,
    '',
    '## Actual Result',
    a.actualResult,
    '',
    '## Root Cause Analysis',
    `Classification: **${a.decision.rootCause}** (confidence: ${a.decision.confidence})`,
    '',
    a.failureReason,
    '',
    `Failure point: ${a.failurePoint}`,
    '',
    '## Error Message',
    '```',
    a.errorMessage.slice(0, 6000),
    '```',
    '',
    '## Stack Trace',
    '```',
    a.stackTrace.slice(0, 6000),
    '```',
    '',
    '## Attachments',
    `- Failure Screenshot: ${listOrNone(art.screenshotPaths)}`,
    `- Trace File: ${listOrNone(art.tracePaths)}`,
    `- Video Recording: ${listOrNone(art.videoPaths)}`,
    `- Execution Logs: ${listOrNone(art.logPaths)}`,
    '',
    '## Additional Notes',
    `- Reporter: Automation Bot`,
    `- Labels: AutomationFailure, Playwright`,
    `- Console logs captured: ${art.consoleLogs.length}`,
    `- Network logs captured: ${art.networkLogs.length}`,
    '',
    '_Generated automatically from Playwright failure analysis._',
  ].join('\n');
}

/** Jira wiki markup variant (for Confluence/legacy wiki fields if needed) */
export function buildDescriptionWiki(analysis: FailureAnalysis): string {
  const a = analysis;
  const art = a.artifacts;
  return [
    'h2. Defect Summary',
    a.decision.rationale,
    '',
    'h2. Environment',
    `* Environment: ${a.environment.environment}`,
    `* Browser: ${a.environment.browser}`,
    `* Browser Version: ${a.environment.browserVersion}`,
    `* OS: ${a.environment.os}`,
    `* Build Version: ${a.environment.buildVersion}`,
    `* Execution Time: ${a.environment.executionTime}`,
    '',
    'h2. Test Information',
    `* Test Case ID: ${a.testCaseId}`,
    `* Test Case Name: ${a.testCaseName}`,
    `* Automation Suite: ${a.suiteTitle}`,
    `* Playwright Test File: ${a.playwrightFile}`,
    '',
    'h2. Steps To Reproduce',
    ...a.stepsToReproduce.map((s, i) => `${i + 1}. ${s}`),
    '',
    'h2. Expected Result',
    a.expectedResult,
    '',
    'h2. Actual Result',
    a.actualResult,
    '',
    'h2. Root Cause Analysis',
    `${a.decision.rootCause}: ${a.failureReason}`,
    '',
    'h2. Error Message',
    '{code}',
    a.errorMessage.slice(0, 6000),
    '{code}',
    '',
    'h2. Attachments',
    `- Failure Screenshot: ${listOrNone(art.screenshotPaths)}`,
    `- Trace File: ${listOrNone(art.tracePaths)}`,
    `- Video Recording: ${listOrNone(art.videoPaths)}`,
    `- Execution Logs: ${listOrNone(art.logPaths)}`,
    '',
    'h2. Additional Notes',
    'Generated automatically by Playwright Jira Defect Agent.',
  ].join('\n');
}

function listOrNone(paths: string[]): string {
  return paths.length ? paths.join(', ') : 'Not available';
}

export function buildDefectPackage(analysis: FailureAnalysis): DefectPackage {
  const config = loadDefectConfig();
  const should = analysis.decision.shouldCreateDefect;

  return {
    generatedAt: new Date().toISOString(),
    status: should ? 'pending_jira' : 'skipped',
    analysis,
    jira: should
      ? {
          summary: buildDefectSummary(analysis),
          descriptionMarkdown: buildDescriptionMarkdown(analysis),
          descriptionWiki: buildDescriptionWiki(analysis),
          priority: config.defaultPriority,
          labels: config.labels,
          component: analysis.featureModule,
          projectKey: config.projectKey,
          issueType: 'Bug',
          duplicateSearchJql: buildDuplicateJql(config.projectKey, analysis),
        }
      : undefined,
  };
}
