# LinkedIn Job Finder (jobs-reporter)

Serverless LinkedIn job monitor for the Truly ecosystem. Scrapes EU job listings hourly, emails HTML reports, and stores run history in DynamoDB.

## Truly ecosystem

This repo is the **market intelligence layer**: early signal on new LinkedIn postings across EU countries before or alongside the jobs-finder CRM workflow.

See the Truly repo [TRULY-ECOSYSTEM.md](https://github.com/dpetrov96/truly/blob/main/docs/TRULY-ECOSYSTEM.md). Deployed on **AWS Lambda (SAM) + EC2** (static web UI), not Render or Vercel.

| Repo | Role |
| --- | --- |
| **truly** | Marketplace platform |
| **truly-v3** | Marketing site |
| **jobs-finder** | Sales CRM: job scraping, AI matching, outreach |
| **lambda-linkedin-finder** (this repo) | Serverless EU LinkedIn job monitor |

## Architecture

```
EventBridge (hourly) ──or── POST /runs/trigger
        ↓
FetchJobsFunction (Lambda)
        ↓
LinkedIn guest jobs API (multi-country × multi-keyword)
        ↓
├── HTML email report (Resend/SES)
└── DynamoDB run history
        ↑
ListRuns / GetRun APIs ← React web on EC2
```

## Stack

- **Backend:** TypeScript, AWS SAM, Node 20, arm64
- **Web:** React 19, Vite 6, Tailwind 4
- **Storage:** DynamoDB (`dev-linkedin-finder-runs`)
- **Region:** eu-central-1

## Deploy

```bash
# Lambda (SAM)
cd backend && sam build && sam deploy

# Web (EC2)
./scripts/deploy-web-ec2.sh
```

GitHub Actions deploy Lambda on backend changes and rsync web build to EC2.
