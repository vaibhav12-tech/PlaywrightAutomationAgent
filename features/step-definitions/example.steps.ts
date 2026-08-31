import { Given, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { ExamplePage } from '../../src/pages/ExamplePage';
import type { PlaywrightWorld } from '../../src/hooks/world';

Given('I navigate to the example page', async function (this: PlaywrightWorld) {
  const page = this.requirePage();
  const examplePage = new ExamplePage(page);
  await examplePage.goto();
});

Given('I navigate to the login page', async function (this: PlaywrightWorld) {
  const page = this.requirePage();
  const examplePage = new ExamplePage(page);
  await examplePage.goto();
});

Then('the page title should be {string}', async function (this: PlaywrightWorld, expectedTitle: string) {
  const page = this.requirePage();
  const examplePage = new ExamplePage(page);
  const title = await examplePage.getTitle();
  expect(title).toBe(expectedTitle);
});
