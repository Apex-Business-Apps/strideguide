# GitHub Repository Setup Instructions

This document outlines the **manual configuration steps** required in the GitHub UI to complete the trunk-based workflow setup.

## 1. Branch Protection Rules

### Protect `main` Branch

Navigate to: **Settings → Branches → Add branch protection rule**

Branch name pattern: `main`

**Required settings:**

- ✅ **Require a pull request before merging**
  - ✅ Require approvals: **1** (minimum)
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ✅ Require review from Code Owners

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - **Add required status checks:**
    - `Lint & Type Check`
    - `Build`
    - `Accessibility Tests`
    - `All Checks Passed`

- ✅ **Require conversation resolution before merging**

- ✅ **Require signed commits** (recommended)

- ✅ **Require linear history** (recommended for clean history)

- ✅ **Do not allow bypassing the above settings**

- ✅ **Restrict pushes that create matching branches**
  - Only allow: **No one** (block direct pushes)

- ✅ **Allow force pushes: NO**

- ✅ **Allow deletions: NO**

---

## 2. GitHub Environments

### Create Staging Environment

Navigate to: **Settings → Environments → New environment**

**Environment name:** `staging`

**Deployment protection rules:**
- ✅ Required reviewers: Add at least 1 reviewer from @stride-guide/devops-team
- ✅ Wait timer: 0 minutes (optional, can add delay)

**Environment secrets:** (if needed)
- Add any staging-specific secrets

### Create Production Environment

**Environment name:** `production`

**Deployment protection rules:**
- ✅ Required reviewers: Add at least 2 reviewers from @stride-guide/core-team or senior leadership
- ✅ Wait timer: 5 minutes (gives time to verify staging)
- ✅ Deployment branches: **Protected branches only** (only `main`)

**Environment secrets:** (if needed)
- Add production secrets (Stripe keys, Supabase keys, etc.)

---

## 3. GitHub Teams Setup

Navigate to: **Organization Settings → Teams**

### Create Required Teams:

1. **@stride-guide/core-team** - Core maintainers, default reviewers
2. **@stride-guide/ml-team** - ML/vision systems
3. **@stride-guide/vision-team** - Camera/vision processing
4. **@stride-guide/safety-team** - Emergency/SOS features
5. **@stride-guide/a11y-team** - Accessibility
6. **@stride-guide/i18n-team** - Localization
7. **@stride-guide/backend-team** - Supabase/edge functions
8. **@stride-guide/security-team** - Security/privacy
9. **@stride-guide/devops-team** - Infrastructure/CI/CD
10. **@stride-guide/billing-team** - Stripe/subscriptions
11. **@stride-guide/qa-team** - Testing/quality assurance

**For each team:**
- Add appropriate team members
- Set team visibility (Visible or Secret)
- Grant **Write** permission to repository
- CODEOWNERS will auto-assign based on file paths

---

## 4. Repository Settings

Navigate to: **Settings → General**

### Pull Requests
- ✅ Allow squash merging (recommended for clean history)
- ✅ Default to pull request title for squash merge commit
- ❌ Allow merge commits (disable)
- ❌ Allow rebase merging (disable)
- ✅ Always suggest updating pull request branches
- ✅ Automatically delete head branches

### Merge Queue (optional, for high-velocity teams)
- ✅ Enable merge queue
- Set merge method to **Squash and merge**

---

## 5. Commit Signature Verification (Optional but Recommended)

### Enable Vigilant Mode

Navigate to: **Settings → Code security and analysis**

- ✅ **Flag unsigned commits**: Enable

### Require Signed Commits

Already set in branch protection rule above.

**Team members must:**
1. Set up GPG or SSH signing keys
2. Configure Git to sign commits:
   ```bash
   git config --global commit.gpgsign true
   ```

---

## 6. Install Commitlint Dependencies

Run locally or in CI:

```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

Or add via Lovable:
- `@commitlint/cli`
- `@commitlint/config-conventional`

---

## 7. Install Semantic Release (for auto-versioning)

Run locally or in CI:

```bash
npm install --save-dev semantic-release @semantic-release/git @semantic-release/changelog
```

Create `.releaserc.json`:

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "@semantic-release/npm",
    "@semantic-release/git",
    "@semantic-release/github"
  ]
}
```

---

## 8. Conventional Commits Enforcement

All commits must follow the format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Examples:**

```
feat(vision): add winter mode hazard detection

Implements enhanced contrast detection for snow/ice conditions.
Includes thermal throttling protection.

Closes #234
```

```
fix(sos): ensure GPS coordinates in airplane mode

SOS now correctly captures GPS even when data is disabled.

Fixes #567
```

```
perf(guidance): reduce audio latency to 80ms

Optimized audio buffer management for faster response.
```

**Commit types:** feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert, a11y, i18n, security

**Scopes:** vision, guidance, sensors, sos, i18n, a11y, auth, settings, ui, api, db, stripe, pwa, deps, config, ci, security, docs

---

## 9. Workflow Testing

### Test PR Workflow:

1. Create a feature branch:
   ```bash
   git checkout -b feat/test-workflow
   ```

2. Make a change with conventional commit:
   ```bash
   git commit -m "feat(ci): test branch protection workflow"
   ```

3. Push and create PR:
   ```bash
   git push origin feat/test-workflow
   ```

4. Verify:
   - ✅ CI checks run automatically
   - ✅ CODEOWNERS auto-assigned as reviewers
   - ✅ Status checks must pass
   - ✅ Cannot merge without approval
   - ✅ Cannot push directly to main

---

## 10. Emergency Procedures

### Hotfix Process:

1. Create hotfix branch from main:
   ```bash
   git checkout -b hotfix/critical-issue main
   ```

2. Make fix with conventional commit:
   ```bash
   git commit -m "fix(sos): critical GPS failure in offline mode"
   ```

3. Create PR, get expedited review

4. After merge, semantic-release will auto-version as patch

### Breaking the Glass (Emergency Only):

If absolutely necessary to bypass protections:

1. Navigate to: **Settings → Branches → Edit protection rule**
2. Temporarily check: **Allow specified actors to bypass required pull requests**
3. Add specific admin user
4. Make emergency change
5. **IMMEDIATELY REVERT** bypass setting

---

## Summary Checklist

- [ ] Branch protection enabled on `main`
- [ ] Required status checks configured
- [ ] PR approvals required (1 minimum)
- [ ] CODEOWNERS file reviewed and teams created
- [ ] GitHub teams created and members added
- [ ] Staging environment created with required reviewers
- [ ] Production environment created with 2+ reviewers
- [ ] Squash merging enabled, others disabled
- [ ] Auto-delete head branches enabled
- [ ] Commitlint dependencies installed
- [ ] Semantic-release configured
- [ ] Conventional Commits documented for team
- [ ] Test PR workflow verified
- [ ] Emergency procedures documented and understood

---

## Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [GitHub Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
