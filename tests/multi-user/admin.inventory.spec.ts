import { InventoryPage } from '../../src/pages';
import { test, expect } from '../../src/fixtures/session';

/**
 * Admin role — reuses playwright/.auth/users/admin.storage.json
 * Prepared by global-setup (or auto-created by SessionManager on demand).
 */
test.describe('Multi-user @Admin', () => {
  test('Admin lands on inventory without logging in again', async ({ adminPage }) => {
    const inventory = new InventoryPage(adminPage);

    await expect(adminPage).toHaveURL(/inventory\.html/);
    await expect(adminPage.locator('[data-test="login-button"]')).toHaveCount(0);
    await inventory.expectProductsPageLoaded();

    const cookieUser = (await adminPage.context().cookies('https://www.saucedemo.com')).find(
      (c) => c.name === 'session-username'
    )?.value;
    expect(cookieUser).toBe(process.env.SAUCE_ADMIN_USER || 'standard_user');
  });
});
