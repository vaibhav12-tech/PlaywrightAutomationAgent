@loyaltyProfile @apiEnrollment @smoke @regression
# Run both API+UI enrollment and complete-profile UI:
#   npm run test:loyalty-profile
# API-only this file: npm run test:api-enrollment
# API-only enrollment: no signup form UI. Session cookies log the user in; browser opens Home.
Feature: User profile enrollment and verification via API
  Create/enroll the user via the Enrollment API without showing the enrollment form.
  After success the user is automatically logged in, redirected to Home, and the
  displayed name must match the name from the enrollment API response.

  Scenario Outline: Enroll profile via API and verify name on Home
    Given I enroll a loyalty profile via API with:
      | phone              | <phone>              |
      | verification_code  | <verification_code>  |
      | first_name         | <first_name>         |
      | last_name          | <last_name>          |
      | date_of_birth      | <date_of_birth>      |
      | email              | <email>              |
      | zip                | <zip>                |
    Then the profile enrollment should be successful
    When I navigate to the Home page while logged in
    Then the Home page should display the enrolled user name

  Examples:
    # phone=UNIQUE generates a fresh number each run (existing accounts skip signup).
    | phone  | verification_code | first_name | last_name | date_of_birth | email             | zip   |
    | UNIQUE | 112233            | John       | Doe       | 1992-08-03    | john.doe@test.com | 90210 |
