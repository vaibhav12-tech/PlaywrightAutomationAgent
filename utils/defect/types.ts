export type RootCause =
  | 'Product Bug'
  | 'Automation Issue'
  | 'Environment Issue'
  | 'Test Data Issue'
  | 'Infrastructure Issue'
  | 'Network Instability'
  | 'Known Flaky Test';

export type DefectDecision = {
  shouldCreateDefect: boolean;
  rootCause: RootCause;
  confidence: 'high' | 'medium' | 'low';
  rationale: string;
};

export type FailureEnvironment = {
  environment: string;
  browser: string;
  browserVersion: string;
  os: string;
  buildVersion: string;
  frameworkVersion: string;
  testRunId: string;
  executionTime: string;
};

export type FailureArtifacts = {
  screenshotPaths: string[];
  tracePaths: string[];
  videoPaths: string[];
  logPaths: string[];
  consoleLogs: string[];
  networkLogs: string[];
};

export type FailureAnalysis = {
  testCaseName: string;
  testCaseId: string;
  featureModule: string;
  suiteTitle: string;
  playwrightFile: string;
  projectName: string;
  failurePoint: string;
  failureReason: string;
  errorMessage: string;
  stackTrace: string;
  expectedResult: string;
  actualResult: string;
  failureStepNumber: string;
  reproducibility: string;
  stepsToReproduce: string[];
  environment: FailureEnvironment;
  artifacts: FailureArtifacts;
  decision: DefectDecision;
};

export type DefectPackage = {
  generatedAt: string;
  status: 'pending_jira' | 'skipped' | 'created' | 'commented_existing';
  analysis: FailureAnalysis;
  jira?: {
    summary: string;
    descriptionMarkdown: string;
    descriptionWiki: string;
    priority: string;
    labels: string[];
    component: string;
    projectKey: string;
    issueType: string;
    duplicateSearchJql: string;
  };
  result?: {
    issueKey?: string;
    issueUrl?: string;
    action?: 'created' | 'commented' | 'skipped';
    attachedArtifacts?: string[];
  };
};
