# Production operations

Target topology:

- Host: `root@45.9.188.118`
- Checkout: `/var/www/careguide`
- App: `127.0.0.1:7100`
- Domain: `careguide.forvexa.com`
- Public proxy: existing host Nginx on ports 80/443
- Database: managed Supabase in an EU region

## Production secrets

Create `.env.production` locally and keep it out of Git and Docker build context. Set mode `600` on the server. Required names:

```dotenv
NODE_ENV="production"
NUXT_PUBLIC_APP_ORIGIN="https://careguide.forvexa.com"
NUXT_PUBLIC_DEMO_MODE="false"
NUXT_PUBLIC_SUPABASE_URL="https://PROJECT.supabase.co"
NUXT_PUBLIC_SUPABASE_KEY="sb_publishable_..."
NUXT_SUPABASE_SECRET_KEY="SERVER_ONLY_SECRET"
NUXT_OPENAI_API_KEY="SERVER_ONLY_SECRET"
NUXT_OPENAI_MODEL="gpt-5.4-mini"
NUXT_SESSION_SECRET="AT_LEAST_32_RANDOM_BYTES"
NUXT_HASHING_SALT="AT_LEAST_32_RANDOM_BYTES"
NUXT_PROMPT_VERSION="booking-agent-v1"
SUPABASE_DATABASE_URL="postgresql://postgres.PROJECT:PASSWORD@POOLER:5432/postgres"
SUPABASE_BACKUP_CONFIRMED="true"
SUPABASE_URL="https://PROJECT.supabase.co"
SUPABASE_SECRET_KEY="SERVER_ONLY_SECRET"
```

Do not print the file, use `docker compose config` without `--quiet`, place secrets in shell history, or store them in GitHub artifacts. Rotate OpenAI, Supabase, and signing secrets after suspected exposure. Rotating the session secret intentionally invalidates all demo sessions.

## Release

Prerequisites:

1. `careguide.forvexa.com` resolves to `45.9.188.118`.
2. The Git remote and deployment branch exist.
3. Managed Supabase backup status is green.
4. `pnpm eval:live` passes for the release model/prompt.
5. `.env.production` exists locally.

```bash
export GIT_REPOSITORY_URL='git@YOUR-ALIAS:OWNER/REPO.git'
export BRANCH=main
sh scripts/deploy-vps.sh
```

The script refuses a dirty/divergent remote checkout, verifies port `7100`, transfers the environment separately, builds a Git-SHA image, runs the migration role, starts app/worker, and requires loopback health.

## Nginx and HTTPS

Before writing anything, inspect the live site and the DishDrop reference:

```bash
ssh root@45.9.188.118 'test -e /etc/nginx/sites-available/careguide.forvexa.com && sed -n "1,220p" /etc/nginx/sites-available/careguide.forvexa.com || true'
ssh root@45.9.188.118 'sed -n "1,220p" /etc/nginx/sites-enabled/dishdrop.forvexa.com'
```

Install the reviewed HTTP-only config from `ops/nginx/careguide.forvexa.com.conf`, create `/var/www/careguide.forvexa.com`, enable the symlink, and run `nginx -t`. Reload only after a valid test. Verify HTTP reaches the app, then run:

```bash
ssh root@45.9.188.118 'certbot --nginx -d careguide.forvexa.com'
ssh root@45.9.188.118 'nginx -t && systemctl reload nginx'
curl -I http://careguide.forvexa.com
curl -I https://careguide.forvexa.com/api/health/live
```

After Certbot succeeds, replace the generated site with the reviewed `ops/nginx/careguide.forvexa.com.https.conf`, run `nginx -t`, and reload. That final template adds HSTS and the CSP, frame, MIME, referrer, and permissions headers while keeping streaming proxy buffering disabled. Verify `certbot renew --dry-run` during initial deployment.

## Rollback

1. Record the current SHA/image before every release.
2. If readiness or HTTPS verification fails, set `IMAGE_TAG` to the previous healthy tag.
3. Run `docker compose -f compose.production.yml up -d app worker`.
4. Verify loopback health and public HTTPS again.
5. Do not automatically reverse database migrations. All migrations must follow expand/contract compatibility.

Restore database state only through the managed Supabase backup workflow after assessing data impact. Test restores on a branch or separate project before production.

## Incident checklist

1. Stop harmful writes while preserving logs and evidence.
2. Rotate affected provider and session secrets.
3. Inspect sanitized agent/tool events and Supabase audit logs; do not copy patient content into tickets.
4. Roll back the prompt/model or application SHA independently.
5. Re-run safety and booking eval gates before reopening.
6. Document cause, affected interval, remediation, and follow-up owner.

Container logs rotate at 10 MB × 5 files. Health expectations: app liveness within 20 seconds, worker heartbeat under 90 seconds, readiness `503` when production dependencies are unavailable.
