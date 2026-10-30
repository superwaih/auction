# Kivos

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

## Admin accounts

Visit `/admin` to sign in or create an individual account. Admins can manage only their own draws. Passwords use salted scrypt hashes; sessions are stored in MongoDB and use HttpOnly cookies with a seven-day expiry.

On the first sign-in or sign-up request, existing named admins are migrated from their saved listings. Their previous admin name (case-insensitive) is their username and `adminpassword` is their initial password. Migration preserves existing passwords and links their old draws to their account. Names that existed only in browser storage cannot be discovered until they have a saved listing.

The same setup creates `superadmin` with initial password `superadmin`. Visit `/superadmin` for analytics, all admin accounts, password resets and management of all draws. The new-draw form lets the superadmin choose an admin to create a draw on their behalf. Admins can sign in with their initial passwords and change them using the optional Change password action. Subsequent setup runs never reset them.

Password resets revoke the target admin's sessions; the admin can sign in with the new password. Public registration always creates a regular admin; roles are checked on the server. Login attempts are limited per username in MongoDB.

Run the authentication checks with `node --test tests/admin-*.test.mjs`.

## Cloudinary image storage

Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `.env.local` and in your hosting environment, then restart the app. These are server-only credentials. See [Cloudinary upload authentication](https://cloudinary.com/documentation/upload_images#authenticated_requests).

New and replaced listing images upload to Cloudinary through the authenticated listing API. MongoDB stores only their Cloudinary metadata. Public pages use versioned Cloudinary CDN URLs with automatic format/quality and a maximum width of 1400 pixels. JPEG, PNG, WebP, GIF and AVIF are supported; the existing 2 MB post-compression upload limit remains.

Existing MongoDB images remain readable until migrated. Preview the migration with `npm run images:migrate`, then run `npm run images:migrate -- --apply`. The migration uploads each image before replacing its database value, skips listings edited concurrently, and can be rerun. Unsupported legacy formats remain in MongoDB if their upload fails.

Replaced, removed and deleted images are retired after the listing save. Failed Cloudinary deletions remain in `imageCleanup`; retry them with `npm run images:migrate -- --cleanup`. Referenced assets are never deleted by cleanup.
