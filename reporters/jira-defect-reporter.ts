import fs from 'fs';
import path from 'path';
import type {
  FullConfig,
  Reporter,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import {
  buildFailureAnalysis,
  collectArtifactsFromResult,
} from '../utils/defect/failureAnalyzer';
import { buildDefectPackage, loadDefectConfig } from '../utils/defect/jiraDefectBuilder';
import type { DefectPackage } from '../utils/defect/types';

const OUT_DIR = path.join(process.cwd(), 'reports', 'jira-defects');

/**
 * Playwright reporter:
 * - Analyzes failed tests
 * - Classifies root cause
 * - Writes defect packages under reports/jira-defects/
 * - Optionally creates Jira bugs via REST when JIRA_AUTO_CREATE=true + API token set
 *
 * Cursor agent can also process pending packages via MCP (preferred for OAuth sites).
 */
class JiraDefectReporter implements Reporter {
  private packages: DefectPackage[] = [];
  private config!: FullConfig;

  onBegin(config: FullConfig) {
    this.config = config;
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  async onTestEnd(test: TestCase, result: TestResult) {
    if (result.status !== 'failed' && result.status !== 'timedOut') return;

    const errorMessage = result.error?.message || 'Unknown error';
    const stackTrace = result.error?.stack || errorMessage;
    const projectName = test.parent.project()?.name || 'unknown';
    const file = test.location.file;
    const suiteTitle = test.parent.title || 'Playwright Suite';

    const attachments = result.attachments.map((a) => ({
      name: a.name,
      path: a.path,
      contentType: a.contentType,
    }));

    const artifacts = collectArtifactsFromResult({
      outputDir: this.config.projects[0]?.outputDir || path.join(process.cwd(), 'test-results'),
      attachments,
    });

    // Prefer artifacts from this test's output folder when available
    const testOutput = result.attachments.find((a) => a.path)?.path;
    if (testOutput) {
      const dir = path.dirname(testOutput);
      const more = collectArtifactsFromResult({ outputDir: dir, attachments });
      artifacts.screenshotPaths = unique([
        ...artifacts.screenshotPaths,
        ...more.screenshotPaths,
      ]);
      artifacts.tracePaths = unique([...artifacts.tracePaths, ...more.tracePaths]);
      artifacts.videoPaths = unique([...artifacts.videoPaths, ...more.videoPaths]);
      artifacts.logPaths = unique([...artifacts.logPaths, ...more.logPaths]);
    }

    const analysis = buildFailureAnalysis({
      testCaseName: test.title,
      suiteTitle,
      playwrightFile: path.relative(process.cwd(), file),
      projectName,
      errorMessage,
      stackTrace,
      retryCount: result.retry,
      browserName: projectName,
      artifacts,
    });

    const defectPackage = buildDefectPackage(analysis);
    this.packages.push(defectPackage);

    const fileName = `${Date.now()}-${analysis.testCaseId}.json`;
    const outPath = path.join(OUT_DIR, fileName);
    fs.writeFileSync(outPath, JSON.stringify(defectPackage, null, 2), 'utf-8');

    // Also write latest pointer for agent convenience
    fs.writeFileSync(
      path.join(OUT_DIR, 'latest.json'),
      JSON.stringify(defectPackage, null, 2),
      'utf-8'
    );

    console.log('\n[jira-defect-reporter] Failure analyzed');
    console.log(`  Root cause : ${analysis.decision.rootCause}`);
    console.log(`  Create bug : ${analysis.decision.shouldCreateDefect}`);
    console.log(`  Package    : ${outPath}`);

    if (
      analysis.decision.shouldCreateDefect &&
      process.env.JIRA_AUTO_CREATE === 'true'
    ) {
      try {
        const created = await createOrCommentViaRest(defectPackage);
        defectPackage.status = created.action === 'created' ? 'created' : 'commented_existing';
        defectPackage.result = created;
        fs.writeFileSync(outPath, JSON.stringify(defectPackage, null, 2), 'utf-8');
        fs.writeFileSync(
          path.join(OUT_DIR, 'latest.json'),
          JSON.stringify(defectPackage, null, 2),
          'utf-8'
        );
        console.log(`  Jira       : ${created.issueKey} (${created.action})`);
        console.log(`  URL        : ${created.issueUrl}`);
      } catch (err) {
        console.warn(
          `[jira-defect-reporter] REST create failed — package left pending for MCP agent: ${String(err)}`
        );
      }
    } else if (analysis.decision.shouldCreateDefect) {
      console.log(
        '  Next       : Ask Cursor @playwright-jira-defect-agent to create Jira from reports/jira-defects/latest.json'
      );
    }
  }

  onEnd() {
    const pending = this.packages.filter((p) => p.status === 'pending_jira').length;
    const skipped = this.packages.filter((p) => p.status === 'skipped').length;
    if (this.packages.length) {
      console.log(
        `\n[jira-defect-reporter] Done — pending Jira: ${pending}, skipped: ${skipped}, total failures: ${this.packages.length}`
      );
    }
  }
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

async function createOrCommentViaRest(pkg: DefectPackage): Promise<{
  issueKey: string;
  issueUrl: string;
  action: 'created' | 'commented';
  attachedArtifacts: string[];
}> {
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  const base = (process.env.JIRA_BASE_URL || loadDefectConfig().siteBaseUrl).replace(/\/$/, '');
  if (!email || !token) {
    throw new Error('JIRA_EMAIL / JIRA_API_TOKEN required for JIRA_AUTO_CREATE=true');
  }
  if (!pkg.jira) throw new Error('No jira payload on package');

  const auth = Buffer.from(`${email}:${token}`).toString('base64');
  const headers = {
    Authorization: `Basic ${auth}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  // Duplicate search
  const jql = encodeURIComponent(pkg.jira.duplicateSearchJql);
  const searchRes = await fetch(
    `${base}/rest/api/3/search/jql?jql=${jql}&maxResults=5&fields=key,summary`,
    { headers }
  );
  if (!searchRes.ok) {
    // fallback older search endpoint
  }
  let existingKey: string | undefined;
  if (searchRes.ok) {
    const body = (await searchRes.json()) as {
      issues?: { key: string; fields?: { summary?: string } }[];
    };
    existingKey = body.issues?.[0]?.key;
  }

  const attachedArtifacts = [
    ...pkg.analysis.artifacts.screenshotPaths,
    ...pkg.analysis.artifacts.tracePaths,
    ...pkg.analysis.artifacts.videoPaths,
    ...pkg.analysis.artifacts.logPaths,
  ];

  if (existingKey) {
    await fetch(`${base}/rest/api/3/issue/${existingKey}/comment`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: `Automation re-failure at ${pkg.generatedAt}\n\n${pkg.analysis.errorMessage.slice(0, 1500)}`,
                },
              ],
            },
          ],
        },
      }),
    });
    await uploadAttachments(base, auth, existingKey, attachedArtifacts);
    return {
      issueKey: existingKey,
      issueUrl: `${base}/browse/${existingKey}`,
      action: 'commented',
      attachedArtifacts,
    };
  }

  const createRes = await fetch(`${base}/rest/api/3/issue`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      fields: {
        project: { key: pkg.jira.projectKey },
        issuetype: { name: pkg.jira.issueType },
        summary: pkg.jira.summary,
        description: {
          type: 'doc',
          version: 1,
          content: markdownToSimpleAdf(pkg.jira.descriptionMarkdown),
        },
        priority: { name: pkg.jira.priority },
        labels: pkg.jira.labels,
        components: [{ name: pkg.jira.component }],
      },
    }),
  });

  if (!createRes.ok) {
    // Retry without component if component doesn't exist
    const retry = await fetch(`${base}/rest/api/3/issue`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fields: {
          project: { key: pkg.jira.projectKey },
          issuetype: { name: 'Bug' },
          summary: pkg.jira.summary,
          description: {
            type: 'doc',
            version: 1,
            content: markdownToSimpleAdf(pkg.jira.descriptionMarkdown),
          },
          priority: { name: pkg.jira.priority },
          labels: pkg.jira.labels,
        },
      }),
    });
    if (!retry.ok) {
      throw new Error(`Jira create failed: ${retry.status} ${await retry.text()}`);
    }
    const created = (await retry.json()) as { key: string };
    await uploadAttachments(base, auth, created.key, attachedArtifacts);
    return {
      issueKey: created.key,
      issueUrl: `${base}/browse/${created.key}`,
      action: 'created',
      attachedArtifacts,
    };
  }

  const created = (await createRes.json()) as { key: string };
  await uploadAttachments(base, auth, created.key, attachedArtifacts);
  return {
    issueKey: created.key,
    issueUrl: `${base}/browse/${created.key}`,
    action: 'created',
    attachedArtifacts,
  };
}

async function uploadAttachments(
  base: string,
  basicAuth: string,
  issueKey: string,
  files: string[]
) {
  for (const filePath of files.slice(0, 10)) {
    if (!fs.existsSync(filePath)) continue;
    const form = new FormData();
    const blob = new Blob([fs.readFileSync(filePath)]);
    form.append('file', blob, path.basename(filePath));
    await fetch(`${base}/rest/api/3/issue/${issueKey}/attachments`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'X-Atlassian-Token': 'no-check',
        Accept: 'application/json',
      },
      body: form,
    });
  }
}

function markdownToSimpleAdf(markdown: string) {
  return markdown.split(/\n{2,}/).map((block) => ({
    type: 'paragraph',
    content: [{ type: 'text', text: block.replace(/\n/g, ' ').slice(0, 8000) }],
  }));
}

export default JiraDefectReporter;
