@completeprofile @signup @smoke @regression
# Run: npm run test:completeprofile (or npm run test:signup). For OTP, set SIGNUP_OTP when needed.
Feature: Revance complete profile
  New users verify their phone, complete the sign-up form, finish onboarding,
  answer profile questions, claim birthday points, and land on the rewards dashboard.

  Scenario Outline: User completes sign-up, profile questions, and sees the rewards dashboard
    Given I am on the Revance Welcome page
    When I enter the phone number "<phone>"
    And I click the Verify button
    And I enter the verification code "<verification_code>"
    And I confirm my phone number
    And I enter my first name "<first_name>"
    And I enter my last name "<last_name>"
    And I select my date of birth "<date_of_birth>"
    And I enter my email "<email>"
    And I enter my zip code "<zip>"
    And I enter my referral code "<referral_code>"
    And I click Apply on the sign-up form
    And I accept all required consent checkboxes
    And I click the Create account button
    And I click Next on the reward claim screen
    And I click Next on the follow-up screen
    And I check the checkbox of all questions to complete the profile
    And I claim the birthday points
    Then I should see the dashboard with "<expected_points>" reward points

  Examples:
    | phone        | verification_code | first_name | last_name | date_of_birth | email             | zip   | referral_code | expected_points |
    | 9000000001   | 000001            | John       | Doe       | 1992-04-16    | john.doe@test.com | 90210 | REF123        | 350             |
