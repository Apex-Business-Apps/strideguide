// Conventional Commits configuration
// Types: build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation only
        'style',    // Formatting, missing semicolons, etc
        'refactor', // Code change that neither fixes a bug nor adds a feature
        'perf',     // Performance improvement
        'test',     // Adding missing tests
        'chore',    // Maintain/tooling
        'ci',       // CI/CD changes
        'build',    // Build system or dependencies
        'revert',   // Revert a previous commit
        'a11y',     // Accessibility improvements
        'i18n',     // Internationalization
        'security', // Security fixes
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'vision',     // ML/camera/vision processing
        'guidance',   // Audio guidance system
        'sensors',    // Device sensors/fall detection
        'sos',        // Emergency/SOS features
        'i18n',       // Localization
        'a11y',       // Accessibility
        'auth',       // Authentication
        'settings',   // Settings/preferences
        'ui',         // UI components
        'api',        // Backend/edge functions
        'db',         // Database/migrations
        'stripe',     // Billing/subscription
        'pwa',        // PWA/service worker
        'deps',       // Dependencies
        'config',     // Configuration
        'ci',         // CI/CD
        'security',   // Security
        'docs',       // Documentation
      ],
    ],
    'subject-case': [2, 'never', ['upper-case', 'pascal-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [2, 'always'],
  },
};
