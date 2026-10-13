#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$BACKEND_DIR"

STACK_NAME="baby-day-out-backend"
ORG_TAG="${ORG_TAG:-Nexus}"

echo "==> Loading backend/.env"
if [ ! -f .env ]; then
  echo "ERROR: backend/.env not found. Copy backend/.env.example to backend/.env and fill in real values." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

echo "==> Validating required environment variables"
MISSING=0
for VAR_NAME in DB_URL DB_NAME GOOGLE_CLIENT_ID; do
  VALUE="${!VAR_NAME:-}"
  if [ -z "$VALUE" ] || [[ "$VALUE" == YOUR_* ]]; then
    echo "ERROR: $VAR_NAME is missing or still set to a placeholder value in backend/.env" >&2
    MISSING=1
  fi
done

if [ "$MISSING" -eq 1 ]; then
  exit 1
fi

for VAR_NAME in SMTP_HOST SMTP_USER SMTP_PASSWORD; do
  VALUE="${!VAR_NAME:-}"
  if [ -z "$VALUE" ] || [[ "$VALUE" == YOUR_* ]]; then
    echo "WARNING: $VAR_NAME looks like a placeholder. 'Complete Day & Send' emails will fail until it is set." >&2
  fi
done

echo "==> Resolving AWS region and profile"
# macOS ships bash 3.2, where expanding an empty array under "set -u" is an error;
# the ${arr[@]+"${arr[@]}"} form below expands to nothing instead.
PROFILE_ARGS=()
if [ -n "${AWS_PROFILE:-}" ]; then
  PROFILE_ARGS=(--profile "$AWS_PROFILE")
  echo "Using AWS_PROFILE=$AWS_PROFILE"
fi

REGION="us-east-1"
echo "Using AWS region: $REGION (hardcoded to US East - N. Virginia)"

echo "==> Verifying AWS credentials (aws sts get-caller-identity)"
CALLER_IDENTITY=$(aws sts get-caller-identity --region "$REGION" ${PROFILE_ARGS[@]+"${PROFILE_ARGS[@]}"} --output json)
echo "$CALLER_IDENTITY"

ACCOUNT_ID=$(echo "$CALLER_IDENTITY" | node -e "process.stdin.once('data', d => console.log(JSON.parse(d).Account))")
CALLER_ARN=$(echo "$CALLER_IDENTITY" | node -e "process.stdin.once('data', d => console.log(JSON.parse(d).Arn))")

echo ""
echo "================================================================"
echo " About to deploy CloudFormation stack: $STACK_NAME"
echo " AWS Account : $ACCOUNT_ID"
echo " AWS Identity: $CALLER_ARN"
echo " AWS Region  : $REGION"
echo "================================================================"
read -r -p "Proceed with deployment? [y/N] " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
  echo "Deployment cancelled."
  exit 1
fi

echo "==> Building Lambda deployment package"
npm run build

echo "==> Running sam build"
sam build --template-file template.yaml ${PROFILE_ARGS[@]+"${PROFILE_ARGS[@]}"}

echo "==> Running sam deploy"
sam deploy \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  ${PROFILE_ARGS[@]+"${PROFILE_ARGS[@]}"} \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset \
  --tags "ORG=$ORG_TAG" "APP=baby-day-out" \
  --parameter-overrides \
    "DbUrl=${DB_URL}" \
    "DbName=${DB_NAME}" \
    "GoogleClientId=${GOOGLE_CLIENT_ID}" \
    "SmtpHost=${SMTP_HOST}" \
    "SmtpPort=${SMTP_PORT:-587}" \
    "SmtpUser=${SMTP_USER}" \
    "SmtpPassword=${SMTP_PASSWORD}" \
    "SmtpFrom=${SMTP_FROM:-info@nexuschainconsulting.com}" \
    "FrontendUrl=${FRONTEND_URL:-http://localhost:3000}" \
    "Timezone=${APP_TIMEZONE:-Asia/Kolkata}" \
    "AutoSendSchedule=\"${AUTO_SEND_SCHEDULE:-cron(0 19 * * ? *)}\"" \
    "OrgTag=${ORG_TAG}"

echo "==> Fetching API Gateway URL"
API_URL=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  ${PROFILE_ARGS[@]+"${PROFILE_ARGS[@]}"} \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text)

echo ""
echo "================================================================"
echo " Deployment complete."
echo " API Gateway URL: $API_URL"
echo " Auto-send      : ${AUTO_SEND_SCHEDULE:-cron(0 19 * * ? *)} ${APP_TIMEZONE:-Asia/Kolkata}"
echo ""
echo " Next step: set VITE_API_URL=$API_URL in frontend/.env, then run"
echo " 'cd frontend && npm install && npm run deploy'."
echo "================================================================"
