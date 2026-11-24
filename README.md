This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Account registration

Set `MONGO_URI` in `.env` to your MongoDB connection string. Add separate random values for `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET` (at least 32 characters each); generate one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. The server also accepts the existing `ACCESS_TOKEN` setting as a temporary fallback for `ACCESS_TOKEN_SECRET`.

The Express API uses port `8000` by default (or `PORT` if set). Login returns a 15-minute access token in JSON and sets a 7-day refresh token in an HttpOnly cookie. The access page keeps the access token in memory; client code can read it with `getAccessToken()` from `lib/auth.ts` and send it as `Authorization: Bearer <accessToken>` to protected endpoints such as `/me`. After a page reload or an expired access token, call `POST /refresh` with credentials included and pass the new access token to `setAccessToken()`. Call `POST /logout` to revoke the current refresh token. Each account currently has one active refresh-token session, so signing in again invalidates its previous refresh token.

The access page sends requests to `http://localhost:8000` by default. If the API runs at a different address, set `NEXT_PUBLIC_API_URL` to its origin. For a frontend hosted away from `http://localhost:3000`, set `FRONTEND_URL` to its origin for credentialed CORS requests. In production, serve the API over HTTPS so the refresh cookie is marked `Secure`.

Run the frontend and API in separate terminals:

```bash
npm run dev
npm run server
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
