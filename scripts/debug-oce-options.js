const { chromium } = require('playwright');

function normalize(value) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

(async () => {
  const baseUrl =
    process.env.OCE_BASE_URL ||
    'https://revance-oce--parcopy.sandbox.my.site.com/s/login/?ec=302&startURL=%2Fs%2F';
  const username = process.env.OCE_USERNAME || 'm.abishek@rsystems.com';
  const password = process.env.OCE_PASSWORD || 'abiram@A1994';
  const wantedPractice = 'Alpha - B2C True Portal Onboarded';
  const wantedLocation = 'Franklinton — LA';

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="text"], input[type="email"]').first().fill(username);
    await page.locator('input[type="password"]').first().fill(password);
    await page.getByRole('button', { name: /log\s*in/i }).first().click();

    await page.waitForURL(/LoginFlow/i, { timeout: 120000 });

    const practiceSelect = page.locator('select').first();
    await practiceSelect.waitFor({ state: 'visible', timeout: 90000 });
    const practiceOptions = await practiceSelect.evaluate((el) =>
      Array.from(el.options).map((o) => ({ value: o.value, label: (o.textContent || '').trim() }))
    );
    console.log('Practice options:', JSON.stringify(practiceOptions, null, 2));

    const wanted = normalize(wantedPractice);
    const match = practiceOptions.find((o) => normalize(o.label) === wanted) ||
      practiceOptions.find((o) => normalize(o.label).includes(wanted) || wanted.includes(normalize(o.label)));
    if (!match) {
      console.log('Wanted practice not found:', wantedPractice);
      return;
    }

    await practiceSelect.selectOption({ value: match.value });
    await page.getByRole('button', { name: /continue/i }).click();

    const locationSelect = page.locator('select').first();
    await locationSelect.waitFor({ state: 'visible', timeout: 30000 });
    const locationOptions = await locationSelect.evaluate((el) =>
      Array.from(el.options).map((o) => ({ value: o.value, label: (o.textContent || '').trim() }))
    );
    console.log('Location options:', JSON.stringify(locationOptions, null, 2));
    console.log(
      'Has wanted location:',
      locationOptions.some((o) => normalize(o.label) === normalize(wantedLocation))
    );
  } finally {
    await page.waitForTimeout(1500);
    await browser.close();
  }
})();
