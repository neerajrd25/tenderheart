#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$FRONTEND_DIR"

STACK_NAME="baby-day-out-frontend"
ORG_TAG="${ORG_TAG:-Nexus}"
DOMAIN_NAME="${DOMAIN_NAME:-tenderheart.nexuschainconsulting.com}"
# CloudFront only accepts ACM certificates from us-east-1, and the backend lives there too.
REGION="us-east-1"

echo "==> Loading frontend/.env (and .env.production if present)"
if [ ! -f .env ] && [ ! -f .env.production ]; then
  echo "ERROR: neither frontend/.env nor frontend/.env.production found." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
[ -f .env ] && source .env
# Production values win, exactly as they do for 'vite build'.
# shellcheck disable=SC1091
[ -f .env.production ] && source .env.production
set +a

echo "==> Validating required environment variables"
MISSING=0
for VAR_NAME in VITE_API_URL VITE_GOOGLE_CLIENT_ID; do
  VALUE="${!VAR_NAME:-}"
  if [ -z "$VALUE" ] || [[ "$VALUE" == YOUR_* ]]; then
    echo "ERROR: $VAR_NAME is missing or still set to a placeholder value" >&2
    MISSING=1
  fi
done

if [[ "${VITE_API_URL:-}" == http://localhost* ]]; then
  echo "ERROR: VITE_API_URL points at localhost. Put the live API Gateway URL in frontend/.env.production." >&2
  MISSING=1
fi

if [ "$MISSING" -eq 1 ]; then
  exit 1
fi

# macOS ships bash 3.2, where expanding an empty array under "set -u" is an error;
# the ${arr[@]+"${arr[@]}"} form below expands to nothing instead.
PROFILE_ARGS=()
if [ -n "${AWS_PROFILE:-}" ]; then
  PROFILE_ARGS=(--profile "$AWS_PROFILE")
  echo "Using AWS_PROFILE=$AWS_PROFILE"
fi
echo "Using AWS region: $REGION"

echo "==> Verifying AWS credentials (aws sts get-caller-identity)"
CALLER_IDENTITY=$(aws sts get-caller-identity --region "$REGION" ${PROFILE_ARGS[@]+"${PROFILE_ARGS[@]}"} --output json)
echo "$CALLER_IDENTITY"

ACCOUNT_ID=$(echo "$CALLER_IDENTITY" | node -e "process.stdin.once('data', d => console.log(JSON.parse(d).Account))")
CALLER_ARN=$(echo "$CALLER_IDENTITY" | node -e "process.stdin.once('data', d => console.log(JSON.parse(d).Arn))")

echo ""
echo "================================================================"
echo " About to run the following against AWS:"
echo "   1. Find or request an HTTPS certificate for $DOMAIN_NAME"
echo "   2. Deploy/update CloudFormation stack: $STACK_NAME (S3 + CloudFront)"
echo "   3. Build the app against $VITE_API_URL and sync it to S3"
echo "   4. Create a CloudFront invalidation"
echo ""
echo " AWS Account : $ACCOUNT_ID"
echo " AWS Identity: $CALLER_ARN"
echo " AWS Region  : $REGION"
echo "================================================================"
read -r -p "Proceed with deployment? [y/N] " CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
  echo "Deployment cancelled."
  exit 1
fi

# DNS zone the records go into, e.g. tenderheart.nexuschainconsulting.com -> nexuschainconsulting.com
ROOT_DOMAIN="${DOMAIN_NAME#*.}"
# GoDaddy wants the record name without the zone: "_abc.tenderheart", not the full name.
godaddy_host() {
  local name="${1%.}"
  echo "${name%."$ROOT_DOMAIN"}"
}

echo "==> Looking for an ACM certificate for $DOMAIN_NAME"
CERT_ARN=$(aws acm list-certificates --region "$REGION" ${PROFILE_ARGS[@]+"${PROFILE_ARGS[@]}"} \
  --query "CertificateSummaryList[?DomainName=='$DOMAIN_NAME'].CertificateArn | [0]" --output text)

if [ -z "$CERT_ARN" ] || [ "$CERT_ARN" == "None" ]; then
  echo "None found. Requesting one (DNS validation)."
  CERT_ARN=$(aws acm request-certificate --region "$REGION" ${PROFILE_ARGS[@]+"${PROFILE_ARGS[@]}"} \
    --domain-name "$DOMAIN_NAME" --validation-method DNS \
    --tags "Key=ORG,Value=$ORG_TAG" "Key=APP,Value=baby-day-out" \
    --query CertificateArn --output text)
fi
echo "Certificate: $CERT_ARN"

cert_field() {
  aws acm describe-certificate --region "$REGION" ${PROFILE_ARGS[@]+"${PROFILE_ARGS[@]}"} \
    --certificate-arn "$CERT_ARN" --query "$1" --output text
}

if [ "$(cert_field 'Certificate.Status')" != "ISSUED" ]; then
  # The validation record takes a few seconds to appear after the request.
  RECORD_NAME="None"
  for _ in $(seq 1 12); do
    RECORD_NAME=$(cert_field 'Certificate.DomainValidationOptions[0].ResourceRecord.Name')
    [ "$RECORD_NAME" != "None" ] && break
    sleep 5
  done
  RECORD_VALUE=$(cert_field 'Certificate.DomainValidationOptions[0].ResourceRecord.Value')

  echo ""
  echo "================================================================"
  echo " ACTION NEEDED in GoDaddy (DNS for $ROOT_DOMAIN) - add this record:"
  echo ""
  echo "   Type : CNAME"
  echo "   Name : $(godaddy_host "$RECORD_NAME")"
  echo "   Value: ${RECORD_VALUE%.}"
  echo "   TTL  : default"
  echo ""
  echo " This proves to AWS that you own the domain. Waiting for AWS to see it"
  echo " (usually 2-10 minutes after you save the record). Safe to Ctrl+C and"
  echo " re-run this script later; it picks up the same certificate."
  echo "================================================================"

  until aws acm wait certificate-validated --region "$REGION" ${PROFILE_ARGS[@]+"${PROFILE_ARGS[@]}"} --certificate-arn "$CERT_ARN" 2>/dev/null; do
    STATUS=$(cert_field 'Certificate.Status')
    if [ "$STATUS" != "PENDING_VALIDATION" ]; then
      echo "ERROR: certificate is in status $STATUS. Check it in the ACM console ($REGION)." >&2
      exit 1
    fi
    echo "Still waiting for the DNS record..."
  done
  echo "Certificate issued."
fi

echo "==> Deploying infrastructure (sam deploy)"
sam deploy \
  --template-file infra/template.yaml \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  ${PROFILE_ARGS[@]+"${PROFILE_ARGS[@]}"} \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset \
  --tags "ORG=$ORG_TAG" "APP=baby-day-out" \
  --parameter-overrides \
    "OrgTag=${ORG_TAG}" \
    "DomainName=${DOMAIN_NAME}" \
    "CertificateArn=${CERT_ARN}"

echo "==> Fetching stack outputs"
stack_output() {
  aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" --region "$REGION" ${PROFILE_ARGS[@]+"${PROFILE_ARGS[@]}"} \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}
BUCKET_NAME=$(stack_output BucketName)
DISTRIBUTION_ID=$(stack_output DistributionId)
DISTRIBUTION_DOMAIN=$(stack_output DistributionDomainName)

echo "S3 bucket           : $BUCKET_NAME"
echo "CloudFront dist. ID : $DISTRIBUTION_ID"
echo "CloudFront domain   : $DISTRIBUTION_DOMAIN"

echo "==> Installing dependencies and building (VITE_* vars are baked in at build time)"
npm ci
npm run build

echo "==> Uploading hashed assets with long immutable caching"
aws s3 sync dist/ "s3://$BUCKET_NAME/" \
  --region "$REGION" ${PROFILE_ARGS[@]+"${PROFILE_ARGS[@]}"} \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" --exclude "sw.js" --exclude "manifest.webmanifest" --exclude "registerSW.js"

echo "==> Uploading index.html, service worker and manifest with no-cache"
# These must never be cached, or phones keep running an old version of the installed app.
for FILE in index.html sw.js manifest.webmanifest registerSW.js; do
  if [ -f "dist/$FILE" ]; then
    aws s3 cp "dist/$FILE" "s3://$BUCKET_NAME/$FILE" \
      --region "$REGION" ${PROFILE_ARGS[@]+"${PROFILE_ARGS[@]}"} \
      --cache-control "no-cache, no-store, must-revalidate"
  fi
done

echo "==> Creating CloudFront invalidation"
aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  ${PROFILE_ARGS[@]+"${PROFILE_ARGS[@]}"} \
  --paths "/*"

echo ""
echo "================================================================"
echo " Deployment complete."
echo ""
echo " 1. In GoDaddy (DNS for $ROOT_DOMAIN), add this record if it is not there yet:"
echo ""
echo "      Type : CNAME"
echo "      Name : $(godaddy_host "$DOMAIN_NAME")"
echo "      Value: $DISTRIBUTION_DOMAIN"
echo ""
echo " 2. In the Google Cloud Console, add this Authorized JavaScript origin"
echo "    to the OAuth client:"
echo ""
echo "      https://$DOMAIN_NAME"
echo ""
echo " Then open https://$DOMAIN_NAME on a phone."
echo "================================================================"
