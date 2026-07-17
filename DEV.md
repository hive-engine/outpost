# DEV / staging environment — dev.thebbhproject.com

Isolated staging copy of the site for developing & testing changes (e.g. the Nuxt/Vue
framework migration) WITHOUT touching production. Prod keeps running no matter what
breaks here.

## Layout
- Clone:   /home/ubuntu/outpost-dev   (git branch: `dev`, off `bbhproject`)
- Service: outpost-dev.service -> `nuxt start` on 127.0.0.1:8082 (enabled, own .env)
- nginx:   /etc/nginx/sites-available/outpost-dev -> dev.thebbhproject.com -> :8082
           basic-auth (user `bbhdev`, pw /root/bbhdev-password.txt) + X-Robots-Tag noindex
- Origin is env-driven: dev .env sets APP_DOMAIN=https://dev.thebbhproject.com & PORT=8082.
  config.js/nuxt.config.js fall back to prod values (www / 8080) when env unset — so the
  code is identical to prod and merges cleanly. NOTHING env-specific is hardcoded in the repo.

## Access (LIVE — real Let's Encrypt cert, HTTPS, DNS active 2026-07-17)
- After DNS: https://dev.thebbhproject.com  (basic-auth prompt)
- Before DNS (test now): add to your machine's hosts file:
      62.210.198.101  dev.thebbhproject.com
  then open https://dev.thebbhproject.com (accept self-signed cert warning + basic-auth).

## Develop / test loop
    cd /home/ubuntu/outpost-dev
    git checkout dev
    # ...make changes / do the migration...
    git commit -am "..."          # commit to dev branch
    ~/outpost-dev-rebuild.sh      # rebuild + restart dev (sources .env)
    # test at https://dev.thebbhproject.com

## Promote to production (when tested & happy)
    # merge dev -> bbhproject
    git push origin dev
    cd /home/ubuntu/outpost
    git checkout bbhproject && git pull
    git merge origin/dev
    NODE_ENV=development npm ci --include=dev && NODE_ENV=production npm run build
    sudo systemctl restart outpost.service

## Go public (owner adds DNS)
- Owner adds:  A  dev  -> 62.210.198.101   (AAAA optional -> IPv6)
- Then real cert:
    sudo certbot --nginx -d dev.thebbhproject.com --redirect --non-interactive --agree-tos -m bjorn@beheydt.be
  (replaces the self-signed cert; basic-auth + noindex stay in place)

## IMPORTANT — dev is NOT a blockchain sandbox
Hive/hive-engine have no testnet wired here: logins use real Keychain signatures and any
vote/comment/post made on dev is a REAL on-chain action. Use a test account for write actions.
