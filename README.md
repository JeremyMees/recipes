# Familierecepten

A private cookbook for the family. Paste a link from a recipe site, the recipe
is parsed and saved in our own layout. Everyone manages their own recipes and
can browse what the rest of the family has saved.

## Stack

- Nuxt 4 + Nuxt UI v4
- Drizzle ORM on Neon Postgres
- TanStack Query for data fetching
- nuxt-auth-utils with Google and Facebook login
- Vitest (unit + component), ESLint, Prettier

## Setup

```bash
pnpm install
cp .env.example .env   # fill in the values, see below
pnpm db:migrate
pnpm dev
```

## Environment variables

| Variable                            | Where it comes from                                                       |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `DATABASE_URL`                      | Neon, the **pooled** connection string (with `-pooler`). Used by the app. |
| `DATABASE_URL_UNPOOLED`             | Neon, the **direct** connection string. Migrations only.                  |
| `NUXT_SESSION_PASSWORD`             | Any random string of at least 32 characters.                              |
| `NUXT_FAMILY_EMAILS`                | Comma-separated list of allowed email addresses.                          |
| `NUXT_OAUTH_GOOGLE_CLIENT_ID`       | Google Cloud Console, OAuth client.                                       |
| `NUXT_OAUTH_GOOGLE_CLIENT_SECRET`   | Same.                                                                     |
| `NUXT_OAUTH_FACEBOOK_CLIENT_ID`     | Facebook Developers, App ID.                                              |
| `NUXT_OAUTH_FACEBOOK_CLIENT_SECRET` | Facebook Developers, App Secret.                                          |

Only addresses listed in `NUXT_FAMILY_EMAILS` can sign in. The list fails
closed: if it is empty, nobody gets in.

### Google login

1. [Google Cloud Console](https://console.cloud.google.com/) → create a project.
2. **APIs & Services → OAuth consent screen**: type _External_, and add the
   family members as _Test users_ so the app does not need review.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**,
   type _Web application_.
4. Under **Authorized redirect URIs** add exactly:
   - `http://localhost:3000/auth/google`
   - `https://<your-vercel-domain>/auth/google`
5. Copy the client ID and secret into `.env`.

### Facebook login

1. [Facebook Developers](https://developers.facebook.com/apps) → create an app.
2. Add the **Facebook Login** product.
3. Under **Valid OAuth Redirect URIs** add:
   - `http://localhost:3000/auth/facebook`
   - `https://<your-vercel-domain>/auth/facebook`
4. Add the family members as _Testers_ — without app review Facebook will not
   hand over an email address for anyone else.

## How importing works

`POST /api/recipes/import` fetches the page and reads schema.org `Recipe`
JSON-LD, which most recipe sites publish. If that is missing it falls back to
Open Graph tags for the title and image. Either way it returns a _draft_ that
you review in the editor before saving, so a site that blocks scraping (some
return HTTP 402) still gives you a prefilled form instead of an error.

## Scripts

| Script               | What it does                         |
| -------------------- | ------------------------------------ |
| `pnpm dev`           | Dev server on http://localhost:3000  |
| `pnpm build`         | Production build                     |
| `pnpm test`          | Unit and component tests             |
| `pnpm test:coverage` | Tests with coverage                  |
| `pnpm lint`          | ESLint                               |
| `pnpm typecheck`     | Types                                |
| `pnpm format:fix`    | Prettier                             |
| `pnpm db:generate`   | Generate a migration from the schema |
| `pnpm db:migrate`    | Run migrations                       |
| `pnpm db:studio`     | Drizzle Studio                       |

## Deploy

Set the same variables on Vercel as in `.env`, add the production domain to the
redirect URIs in the Google and Facebook consoles, and run `pnpm db:migrate`
against the production Neon branch.
