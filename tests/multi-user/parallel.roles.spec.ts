import { InventoryPage } from '../../src/pages';
import { test, expect } from '../../src/fixtures/session';
import type { UserRole } from '../../src/session/types';

/**
 * Parallel-friendly examples:
 * - Independent role fixtures can run across workers
 * - asRole() opens multiple authenticated contexts in one test when needed
 */
test.describe.configure({ mode: 'parallel' });

const roles: UserRole[] = ['Admin', 'Manager', 'Agent', 'ReadOnlyUser'];

for (const role of roles) {
  test(`role fixture boots authenticated session for ${role}`, async ({ asRole }) => {
    const page = await asRole(role);
    const inventory = new InventoryPage(page);

    await expect(page).toHaveURL(/inventory\.html/);
    await inventory.expectProductsPageLoaded();
    await expect(page.locator('[data-test="login-button"]')).toHaveCount(0);
  });
}

test('single test can open two role sessions without shared cookies', async ({ asRole }) => {
  const admin = await asRole('Admin');
  const manager = await asRole('Manager');

  const adminUser = (await admin.context().cookies('https://www.saucedemo.com')).find(
    (c) => c.name === 'session-username'
  )?.value;
  const managerUser = (await manager.context().cookies('https://www.saucedemo.com')).find(
    (c) => c.name === 'session-username'
  )?.value;

  expect(adminUser).toBe(process.env.SAUCE_ADMIN_USER || 'standard_user');
  expect(managerUser).toBe(process.env.SAUCE_MANAGER_USER || 'problem_user');
  expect(adminUser).not.toBe(managerUser);
});
