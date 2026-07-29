@headless

# Run: npm run test:headless  (headed browser locally; TEST_ENV=qa)
# Headless in CI only, or set HEADLESS=true locally.
# URL: https://revance-oce--fulldev.sandbox.my.site.com/s/login/
# Optional: OCE_PASSWORD overrides the Examples password.

Feature: Revance OCE headless login

  Users sign in to the fulldev OCE Experience Cloud portal.



  Scenario Outline: User logs in to the OCE portal

    Given I am on the Revance Ready portal

    When I enter the username "<username>"

    And I enter the password "<password>"

    And I click on Sign In

    And Select the practice "<practice>"

    And Select the location "<location>"

    Then I should be logged in to the portal



  Examples:

    | username              | password        | 

    | nexira8494@gicont.com | Revance@12345   |

