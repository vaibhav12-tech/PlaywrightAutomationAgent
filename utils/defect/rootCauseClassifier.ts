import type { DefectDecision, RootCause } from './types';

type ClassifyInput = {
  errorMessage: string;
  stackTrace: string;
  testTitle: string;
  retryCount?: number;
};

const AUTOMATION_PATTERNS = [
  /strict mode violation/i,
  /locator\.(click|fill|check|waitFor)/i,
  /waiting for (locator|selector)/i,
  /Timeout .* exceeded/i,
  /expect\(.*\)\.(toBe|toHave|toContain)/i,
  /Cannot find module/i,
  /TypeError:.*is not a function/i,
  /page\.isClosed/i,
  /Target page, context or browser has been closed/i,
  /Executable doesn't exist/i,
  /test\.fixme/i,
  /ENOENT/i,
];

const ENVIRONMENT_PATTERNS = [
  /net::ERR_/i,
  /ERR_CONNECTION/i,
  /ECONNREFUSED/i,
  /ENOTFOUND/i,
  /certificate/i,
  /SSL/i,
  /502 Bad Gateway/i,
  /503 Service Unavailable/i,
  /504 Gateway Timeout/i,
  /Navigation failed because page crashed/i,
  /browser has been closed/i,
];

const NETWORK_PATTERNS = [
  /net::ERR_INTERNET_DISCONNECTED/i,
  /net::ERR_NETWORK_CHANGED/i,
  /net::ERR_CONNECTION_TIMED_OUT/i,
  /net::ERR_NAME_NOT_RESOLVED/i,
  /socket hang up/i,
  /NetworkError/i,
];

const TEST_DATA_PATTERNS = [
  /test data/i,
  /invalid credentials/i,
  /user not found/i,
  /duplicate (email|username|sku)/i,
  /seed data/i,
  /fixture data/i,
];

const FLAKY_PATTERNS = [
  /flaky/i,
  /intermittent/i,
  /race condition/i,
  /was not stable/i,
];

const PRODUCT_BUG_HINTS = [
  /expected .* received/i,
  /toHaveURL/i,
  /toHaveText/i,
  /toBeVisible/i,
  /toContainText/i,
  /login.*fail/i,
  /not authenticated/i,
  /cart.*empty/i,
  /product.*not.*found/i,
  /assertion/i,
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

/**
 * Classifies failure root cause and decides whether a Jira Bug should be filed.
 * Only Product Bug + reproducible → create defect.
 */
export function classifyRootCause(input: ClassifyInput): DefectDecision {
  const haystack = `${input.errorMessage}\n${input.stackTrace}\n${input.testTitle}`;

  if (matchesAny(haystack, NETWORK_PATTERNS)) {
    return skip('Network Instability', 'Network/connectivity error detected in failure output.');
  }

  if (matchesAny(haystack, FLAKY_PATTERNS) || (input.retryCount ?? 0) >= 2) {
    return skip('Known Flaky Test', 'Failure matches flaky signals or exhausted retries.');
  }

  if (matchesAny(haystack, ENVIRONMENT_PATTERNS)) {
    return skip('Environment Issue', 'Environment/infra HTTP or browser launch failure detected.');
  }

  if (matchesAny(haystack, TEST_DATA_PATTERNS)) {
    return skip('Test Data Issue', 'Failure indicates missing/invalid test data.');
  }

  // Script/setup issues that are clearly automation (missing browser binary, module errors)
  if (
    /Executable doesn't exist/i.test(haystack) ||
    /Cannot find module/i.test(haystack) ||
    /SyntaxError/i.test(haystack)
  ) {
    return skip('Automation Issue', 'Failure is caused by automation/script or tooling setup.');
  }

  // Locator timeouts are often automation OR product — prefer Automation Issue unless
  // assertion about business state failed after navigation succeeded.
  const isAssertionFailure =
    /Error: expect\(/i.test(haystack) ||
    /toHave(Text|URL|Title|Count|Value)/i.test(haystack) ||
    /toBe(Visible|Hidden|Enabled|Disabled|Checked)/i.test(haystack) ||
    /toContainText/i.test(haystack);

  const isPureLocatorTimeout =
    /locator\.(click|fill|waitFor)/i.test(haystack) &&
    /Timeout/i.test(haystack) &&
    !isAssertionFailure;

  if (isPureLocatorTimeout || /strict mode violation/i.test(haystack)) {
    return skip(
      'Automation Issue',
      'Selector/locator instability or strict-mode violation — treat as automation until confirmed in app.'
    );
  }

  if (isAssertionFailure || matchesAny(haystack, PRODUCT_BUG_HINTS)) {
    return {
      shouldCreateDefect: true,
      rootCause: 'Product Bug',
      confidence: 'medium',
      rationale:
        'Assertion/business-state failure after automation actions — likely application defect. Create Jira Bug.',
    };
  }

  // Default: do not auto-file ambiguous failures as product bugs
  return skip(
    'Automation Issue',
    'Ambiguous failure — defaulting to Automation Issue (no auto Jira defect).'
  );
}

function skip(rootCause: RootCause, rationale: string): DefectDecision {
  return {
    shouldCreateDefect: false,
    rootCause,
    confidence: 'medium',
    rationale,
  };
}
