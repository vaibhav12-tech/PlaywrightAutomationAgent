# Playwright + TypeScript + Cucumber (BDD) Automation Framework

## Overview
This framework uses Playwright, TypeScript, and Cucumber for scalable, maintainable, and enterprise-grade end-to-end test automation. It follows clean architecture, the Page Object Model, and BDD best practices.

## Folder Structure
```
.
├── features/
│   ├── example.feature
│   └── step-definitions/
│       └── example.steps.ts
├── src/
│   ├── pages/
│   │   └── ExamplePage.ts
│   ├── hooks/
│   │   └── hooks.ts
│   ├── utils/
│   │   └── env.ts
│   └── config/
│       ├── env.dev.ts
│       ├── env.qa.ts
│       ├── env.prod.ts
│       └── index.ts
├── reports/
├── playwright.config.ts
├── cucumber.js
├── tsconfig.json
├── package.json
└── README.md
```

## How to Run Tests

- **Install dependencies:**
  ```
  npm install
  ```

- **Run all tests:**
  ```
  npm test
  ```

- **Run only smoke tests:**
  ```
  npm run test:smoke
  ```

- **Run only regression tests:**
  ```
  npm run test:regression
  ```

- **Run tests in parallel:**
  ```
  npm run test:parallel
  ```

- **Set environment (dev/qa/prod):**
  ```
  TEST_ENV=qa npm test
  ```

- **View HTML report:**
  - Open `reports/report.html` in your browser.

## Key Features
- Playwright + TypeScript core
- Cucumber BDD with Gherkin feature files
- Page Object Model (POM)
- Environment configs (dev, qa, prod)
- Parallel execution
- Tagging support (@smoke, @regression)
- HTML reporting
- CI/CD friendly
- No hard-coded waits (uses Playwright auto-waiting)
- TypeScript best practices

## Structure & Best Practices
- **features/**: Gherkin feature files and step definitions
- **src/pages/**: Page Object classes
- **src/hooks/**: Test hooks (Before, After, BeforeStep)
- **src/utils/**: Utilities (e.g., environment helpers)
- **src/config/**: Environment configs and loader
- **reports/**: Test reports output

## Extending the Framework
- Add new feature files in `features/`
- Add new step definitions in `features/step-definitions/`
- Add new page objects in `src/pages/`
- Add/modify environment configs in `src/config/`
- Add custom hooks in `src/hooks/`

---

**For more details, see comments in the code files.**
