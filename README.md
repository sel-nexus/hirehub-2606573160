# HireHub Candidate Interest Portal

A responsive, browser-local candidate-interest demo built with React 18, Vite, JavaScript/JSX, and React Router. The experience includes a culture landing page, candidate interest form, fixed-credential demo admin gate, and a dashboard for reviewing, editing, and deleting records.

## Important operating limits

This is a demonstration, not a production recruiting or authentication system. Candidate submissions are stored in `localStorage` under `hirehub_submissions` in the current browser profile only. Admin demo access uses the fixed `admin` / `admin` pair and the tab-scoped `sessionStorage` key `hirehub_admin_auth`. The records and access flag are visible and modifiable by the browser user. Do not use real candidate data or represent records as centrally backed up or shared between devices.

## Requirements

- Node.js 20 or compatible
- npm

## Local development

```sh
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal. Routes are `/`, `/apply`, and `/admin`.

## Tests and production build

```sh
cd frontend
npm test
node node_modules/vite/bin/vite.js build
node node_modules/@playwright/test/cli.js test
```

The component and business-rule suite uses Vitest, Testing Library, and jsdom. Browser journeys use Playwright against Vite's configured live server. Chromium must be installed with `node node_modules/@playwright/test/cli.js install chromium` in a fresh environment when its browser binary is absent.

## Static container

Build and run the AWS-oriented static frontend container from the frontend directory:

```sh
docker build -t hirehub-candidate-portal .
docker run --rm -p 8080:80 hirehub-candidate-portal
```

The nginx configuration serves hashed assets with immutable caching, revalidates the SPA entry document, returns the SPA entry for client routes, and exposes `/healthz`; the root path returns the SPA with HTTP 200. No backend, API, database, or AWS infrastructure resources are included in this repository. The AWS ECS/ALB/CloudFront/CloudFormation wiring is owned by the delivery pipeline.

## Architecture

- `frontend/src/validation/` contains pure input and stored-record validation.
- `frontend/src/storage/` owns submission persistence and tab-scoped demo session behavior.
- `frontend/src/pages/` contains the landing, application, and admin routes.
- `frontend/src/components/` contains navigation, admin login, submission table, and editor dialog.
- `frontend/e2e/` contains one Playwright spec for each user-facing feature area.

The production build creates `frontend/dist/`. Browser storage has no server-side recovery, backup, concurrency control, or cross-device synchronization.

## Verification status

The Developer stage test evidence is in `test_report.yaml`. In the final verification, 59 Vitest unit/component tests passed, 8 Playwright E2E tests passed, and the Vite production build passed. The critic review passed at score 1.00 with zero high-severity failures. AWS deployment, production-path performance targets, and the Docker image build were not executed in this local verification.
