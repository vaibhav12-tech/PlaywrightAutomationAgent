@smoke @regression
Feature: Example page

  Scenario: Open login page and check title
    Given I navigate to the login page
    Then the page title should be "Customer Portal"
