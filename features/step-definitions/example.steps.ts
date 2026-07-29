import { Given, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { ExamplePage } from '../../src/pages/ExamplePage';
import { getPage } from '../../src/hooks/hooks';

let page: Awaited<ReturnType<typeof getPage>>;
let examplePage: ExamplePage;

async function openLoginOrExamplePage() {
  page = await getPage();
  examplePage = new ExamplePage(page);
  await examplePage.goto();
}

Given('I navigate to the example page', async function () {
  await openLoginOrExamplePage();
});

Given('I navigate to the login page', async function () {
  await openLoginOrExamplePage();
});

Then('the page title should be {string}', async function (expectedTitle: string) {
  const title = await examplePage.getTitle();
  expect(title).toBe(expectedTitle);
});
