@treatment
# Run: npm run test:treatment  (excluded from default npm test — needs OCE credentials / UI)
# Needs OCE_BASE_URL (see src/config/env.dev.ts). Optional: OCE_PASSWORD overrides the Examples password.
# Login fields: Salesforce sites use #username / #password (often not label-linked); OcePortalPage resolves main frame or iframe.
Feature: Treatment Creation
  Users open the OCE portal, sign in, choose practice and location, find a patient, and create a Daxxify treatment.

  Scenario Outline: User selects Daxxify treatment, redeems, and confirms
    Given I am on the Revance Ready portal
    When I enter the username "<username>"
    And I enter the password "<password>"
    And I click on login
    And I select the practice "<practice>" And cLick on Continue
    And I select the location "<location>" And click on Continue
    And the patient search box should be visible
    And I enter the mobile number "<phone>"
    And I click on search
    And I select the Daxxify treatment
    And I select redeem
    And I click on confirm treatment
    Then the treatment should be created

  Examples:
    | phone      | username                          | password        | practice                           | location           |
    | 9000000001 | m.abishek@rsystems.com | abiram@A1994   | Alpha - B2C True Portal Onboarded  | Franklinton - LA — 1056 Tanglewood Dr, Franklinton, LA 70438 |
