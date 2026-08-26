# UI redesign requirements

Status: published and verified; real-user adoption feedback pending.

## Product position

- GitHub remains the source of truth.
- The website is the discovery and explanation layer.
- The interface must present observable evidence, not a popularity leaderboard.
- The redesign must remain static, fast, dependency-free, and safe to deploy on
  GitHub Pages.

## Evidence and neutrality

- Rename **Readiness score** to **Observable Evidence Coverage**.
- Replace judgmental A–D grades with descriptive coverage labels such as
  Complete, Strong, Partial, Limited, and Unavailable.
- Explain every observed, missing, and unavailable signal.
- Group evidence into documentation, maintenance, testing, automation,
  security, release, and Technocore-specific sections.
- Link each observable signal to its public evidence when GitHub exposes a safe
  URL.
- State that 100% means all currently measured evidence was found; it does not
  mean perfect, best, secure, endorsed, or eligible for an airdrop.
- Apply exactly the same versioned rubric to every project.
- Never include stars, hype, popularity, or maintainer identity in coverage.
- Keep projects alphabetically ordered by default.
- Do not present score-based ordering as the default view.
- Clearly disclose that the index maintainer also owns
  `hazzanzico/technocore-signed-action`.
- Allow maintainers to propose factual corrections through pull requests.

## Core redesign

- Add a focused hero with project count, last refresh, coverage distribution,
  and freshness information.
- Add a sticky toolbar with search, filters, and sorting.
- Filter by category, coverage label, platform, tests, automation, security,
  releases, and Technocore evidence.
- Sort by repository name, recent activity, last observation, or evidence
  coverage while retaining alphabetical order as the default.
- Provide accessible card and table views.
- Add expandable project details with coverage breakdowns, timestamps, safe
  evidence links, warnings, and unavailable states.
- Add side-by-side project comparison without declaring a winner.
- Add a recent-changes view backed by dated snapshots.
- Add historical evidence charts when at least two meaningful snapshots exist.
- Persist searches, filters, sort order, and selected projects in shareable URL
  parameters.
- Add prominent **Submit a project**, **Correct an observation**, and
  **Read the methodology** actions.
- Present independence, methodology, ownership, and release provenance clearly
  without overwhelming the main index.

## Visual and interaction quality

- Establish a clearer typographic hierarchy and restrained dark visual system.
- Use colour as a secondary signal, never as the only way to communicate state.
- Provide visible focus states and complete keyboard navigation.
- Use semantic landmarks, headings, tables, controls, labels, and live status
  text for assistive technology.
- Respect reduced-motion and operating-system colour preferences.
- Support narrow mobile, tablet, laptop, and wide desktop layouts.
- Keep empty, loading, unavailable, and no-results states understandable without
  external instructions.
- Avoid unnecessary animation and decorative charts.

## Acceptance targets we control

- Test representative layouts at 320, 375, 768, 1024, and 1440 CSS pixels.
- Target Lighthouse scores of at least 95 for performance, accessibility, best
  practices, and SEO under a reproducible desktop and mobile audit.
- Pass automated accessibility checks and complete a manual keyboard review.
- Keep the generated site usable without JavaScript for its core project data.
- Preserve strict output escaping and never execute indexed project code.
- Add automated tests for filtering, sorting, URL state, evidence expansion,
  comparison, and renderer safety.
- Keep generated output deterministic from a saved report and history.

## Adoption-dependent follow-up

These items require a published redesign and cannot be honestly claimed before
real people use it:

- Ask Technocore maintainers and users to test the interface.
- Record actionable feedback without treating anonymous comments as authority.
- Review correction pull requests and document rubric disputes.
- Study which views and workflows people actually use.
- Iterate based on observed usability problems.
- Expand categories and the project catalog after the redesigned foundation is
  stable.

## Verification - 2026-08-26

- All 40 automated tests pass with 98.95% line, 89.39% branch, and 100%
  function coverage.
- Exact-width browser checks pass at 320, 375, 768, 1024, and 1440 CSS pixels
  without horizontal overflow.
- Search, filters, card/table switching, shareable URL state, evidence details,
  and two-project comparison pass in headless Chrome.
- The skip link is the first keyboard target and has a visible focus outline.
- Reproducible Lighthouse mobile and desktop audits score 100 for performance,
  accessibility, best practices, and SEO on the local static preview.
- Real-user and maintainer feedback remains intentionally unclaimed until after
  publication.

## Success condition

The redesign succeeds when a new visitor can discover a relevant project,
understand every coverage result, inspect its evidence, and propose a correction
without needing an explanation from the index maintainer.
