import { InventoryPage } from '../../src/pages';
import { test, expect } from '../../src/fixtures/session';

/**
 * Manager role — defaults to problem_user / secret_sauce
 * Override with SAUCE_MANAGER_USER / SAUCE_MANAGER_PASSWORD.
 */
test.describe('Multi-user @Manager', () => {
  test('Manager (problem_user) session is restored across browsers', async ({
    managerPage,
  }) => {
    const inventory = new InventoryPage(managerPage);

    await expect(managerPage).toHaveURL(/inventory\.html/);
    await expect(managerPage.getByPlaceholder('Username')).toHaveCount(0);
    await inventory.expectProductsPageLoaded();

    const cookieUser = (await managerPage.context().cookies('https://www.saucedemo.com')).find(
      (c) => c.name === 'session-username'
    )?.value;
    expect(cookieUser).toBe(process.env.SAUCE_MANAGER_USER || 'problem_user');
  });
});
