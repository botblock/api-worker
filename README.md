# api-worker

The Cloudflare Worker that powers the BotBlock.org API routes.

Read the API docs at <https://botblock.org/docs>.

## Development

1. Create your `development.env` file. Copy `development.env.sample` and fill out the information.
2. Authenticate with Wrangler by running `wrangler login`.
3. Update `wrangler.toml` for your account.
    - Use `wrangler whoami` to get your account ID, update the value in `wrangler.toml` to match.
    - Use `wrangler kv:namespace create "RATELIMIT"` to create the KV namespace, update the `id` and `preview_id` in `wrangler.toml` to match.
4. Clone a copy of BotBlock's open data with `git clone https://github.com/botblock/data`.
5. Develop with the worker by running `npm run dev`.

## Deployments

`wrangler.toml` and this repository is currently designed for a staging deployment and a production deployment.

Ensure that you've created and configured `staging.env` and `production.env` appropriately.

Ensure that the staging/production environments in `wrangler.toml` have been updated with your zone IDs and routes for the workers.

Ensure that the KV namespaces are created for staging/production environments and are configured in `wrangler.toml`.
Use `wrangler kv:namespace create "RATELIMIT" --env <staging/production>`.

To deploy from local, run `npm run publish:staging` to deploy to staging, and `npm run publish:production` to deploy to the production environment.

To deploy using GitHub, run `make deploy-staging` to force push and deploy to staging, and `make deploy-production` to force push and deploy to the production environment.

Live logs for both environments can be accessed with `npm run logs:staging` and `npm run logs:production` as needed.
