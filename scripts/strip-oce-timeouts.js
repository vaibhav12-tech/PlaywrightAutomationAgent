const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/OcePortalPage.ts');
let source = fs.readFileSync(filePath, 'utf8');
const before = (source.match(/waitForTimeout/g) || []).length;

const settleHelper = `
  /**
   * Prefer locator/network waits. Yields to the next paint(s) only when the UI
   * must re-render after an action with no stable locator yet (Experience Cloud).
   */
  private async settleUi(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page
      .evaluate(
        () =>
          new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          })
      )
      .catch(() => {});
  }
`;

if (!source.includes('private async settleUi')) {
  source = source.replace(
    /constructor\(readonly page: Page\) \{\}/,
    (match) => `${match}\n${settleHelper}`
  );
}

source = source.replace(
  /await this\.page\.waitForTimeout\(\s*\d+\s*\);/g,
  'await this.settleUi();'
);
source = source.replace(
  /if \(!this\.page\.isClosed\(\)\) await this\.page\.waitForTimeout\(\s*\d+\s*\);/g,
  'if (!this.page.isClosed()) await this.settleUi();'
);

const after = (source.match(/waitForTimeout/g) || []).length;
fs.writeFileSync(filePath, source);
console.log(JSON.stringify({ before, after, settleUi: (source.match(/settleUi\(\)/g) || []).length }));
