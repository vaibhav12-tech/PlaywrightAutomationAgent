import { classifyRootCause } from './rootCauseClassifier';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const product = classifyRootCause({
  errorMessage: 'Error: expect(locator).toHaveText(expected)\nExpected: Products\nReceived: Error',
  stackTrace: 'at InventoryPage.expectProductsPageLoaded',
  testTitle: 'Verify Products page',
});
assert(product.shouldCreateDefect === true, 'product assertion should create defect');
assert(product.rootCause === 'Product Bug', 'expected Product Bug');

const automation = classifyRootCause({
  errorMessage: 'strict mode violation: locator resolved to 2 elements',
  stackTrace: 'at InventoryPage',
  testTitle: 'click product',
});
assert(automation.shouldCreateDefect === false, 'strict mode should skip');
assert(automation.rootCause === 'Automation Issue', 'expected Automation Issue');

const network = classifyRootCause({
  errorMessage: 'net::ERR_INTERNET_DISCONNECTED',
  stackTrace: '',
  testTitle: 'open site',
});
assert(network.shouldCreateDefect === false, 'network should skip');

console.log('rootCauseClassifier self-check OK');
