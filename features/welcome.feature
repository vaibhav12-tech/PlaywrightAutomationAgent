@smoke @regression
Feature: Revance Welcome Page

  Scenario: User visits the welcome page and verifies UI elements
    Given I am on the Revance Welcome page
    When I enter the phone number "+1234567890"
    And I click the Verify button
    Then the main heading should be "Welcome to Revance Rewards"
    And the Contact Us link should be visible
