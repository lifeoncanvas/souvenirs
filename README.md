# LICHT Signature Souvenirs

Premium e-commerce for luxury souvenirs, personalised gifts, gift boxes, corporate gifting and bulk event orders.

| Part | Stack |
| --- | --- |
| `frontend/` | React 18 + Vite + Tailwind CSS, React Router, react-helmet-async |
| `backend/` | Spring Boot 3.5 (Java 21 bytecode), Spring Security + JWT, Spring Data JPA |
| Database | [Neon](https://neon.tech) serverless PostgreSQL (optional offline H2 via the `local` profile) |

## Run locally

1. Copy `backend/.env.example` to `backend/.env` and paste your Neon connection string into `DATABASE_URL`
   (Neon console → project → **Connect**; the pooled endpoint is recommended). The `postgresql://…` string
   is used as-is — it is converted to JDBC with SSL required. Also set `JWT_SECRET` to a new random value
   (e.g. `openssl rand -base64 48`); the backend refuses to start without one. The schema is created by the
   Flyway migrations in `backend/src/main/resources/db/migration`, and the placeholder catalogue is seeded
   into empty tables. A database created before Flyway was added is detected and upgraded in place.
2. Start the backend (port 8090). The first start creates `admin@licht.local`; set `ADMIN_PASSWORD` in `.env`
   to choose its password, otherwise a generated one is printed once in the log.

```bash
cd backend && ./mvnw spring-boot:run
```

Offline, without Neon (embedded H2 file database):

```bash
cd backend && SPRING_PROFILES_ACTIVE=local ./mvnw spring-boot:run
```

Frontend (http://localhost:5173, proxies `/api` and `/uploads` to the backend):

```bash
cd frontend && npm install && npm run dev
```

API docs (local profile, or `API_DOCS_ENABLED=true`): http://localhost:8090/api/docs

Backend tests (in-memory H2 database built from the same migrations):

```bash
cd backend && ./mvnw test
```

## Production configuration (environment variables)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon connection string (`postgresql://…` or `jdbc:postgresql://…`) — **required** |
| `DATABASE_USERNAME`, `DATABASE_PASSWORD` | Optional; override credentials embedded in the URL |
| `DB_POOL_SIZE` | Connection pool size (default 5, suited to Neon's pooler) |
| `JWT_SECRET` | Long random secret (≥ 32 bytes) — **required**; there is no default |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | First administrator |
| `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL` | Storefront domain |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `MAIL_FROM`, `ADMIN_NOTIFY_EMAIL` | Transactional email. When unset, emails are logged without their bodies (`MAIL_LOG_BODIES=true` shows them; never in production) |
| `UPLOAD_DIR`, `UPLOAD_PUBLIC_BASE_URL`, `ORPHAN_LOGO_HOURS` | Image storage (swap `StorageService` for Cloudinary/S3); unused customer logos are deleted after 48 h |
| `STORE_CURRENCY` | ISO currency the shop charges in (default `GBP`); keep it in line with the `store` content block |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_BRAND_NAME` | PayPal checkout — see below. PayPal is hidden at checkout until the id and secret are set |
| `TURNSTILE_SECRET_KEY` + `VITE_TURNSTILE_SITE_KEY` (frontend build) | Optional Cloudflare Turnstile CAPTCHA on sign-up, password reset, enquiries and checkout. Set both or neither |
| `UNPAID_ORDER_EXPIRY_HOURS`, `PAYPAL_ORDER_EXPIRY_MINUTES` | Pending unpaid orders are cancelled and restocked after 168 h (manual payment) / 60 min (abandoned PayPal) |
| `MAX_QUANTITY_PER_PRODUCT`, `GUEST_CART_DAYS` | Per-order quantity cap (100; larger orders go through bulk enquiries); guest bag lifetime (30 days) |
| `FORWARD_HEADERS_STRATEGY` | `native` (default) trusts X-Forwarded-* only from a proxy on a private network; `none` when the API is exposed directly |
| `API_DOCS_ENABLED` | Swagger UI at `/api/docs` (off by default outside the local profile) |
| `JPA_DDL_AUTO` | `validate` (default) — Flyway owns the schema; add new changes as `V3__….sql` migrations |
| `SHIPPING_STANDARD_FEE`, `SHIPPING_EXPRESS_FEE`, `SHIPPING_FREE_THRESHOLD` | Delivery pricing |
| `VITE_GA_ID`, `VITE_API_URL` (frontend build) | Google Analytics 4; API origin when it differs from the storefront (also added to the CSP) |

## PayPal checkout

The flow is built and tested; it switches on as soon as credentials are added.

1. In the [PayPal Developer dashboard](https://developer.paypal.com/dashboard/applications), create a REST app
   (start in **Sandbox**). Set `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`, with `PAYPAL_MODE=sandbox`.
2. Add a webhook to the app pointing at `https://<your-api>/api/payments/paypal/webhook` with the events
   `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.PENDING`, `PAYMENT.CAPTURE.DENIED`,
   `PAYMENT.CAPTURE.REFUNDED` and `PAYMENT.CAPTURE.REVERSED`. Put its id in `PAYPAL_WEBHOOK_ID`.
3. Restart the backend; **PayPal** now appears at checkout. Test with a sandbox buyer account, then switch to the
   live app's credentials and `PAYPAL_MODE=live`.

How it works: checkout reserves stock and creates a PayPal order for the server-calculated total; the buyer approves
it in PayPal's window; the server captures it, checks the captured amount and currency, then confirms the order and
emails the customer. The bag is emptied only after capture. Closing or cancelling the PayPal window releases the
stock. If the browser never returns, the webhook captures and confirms instead. Refunds are issued from
**Admin → Orders → (order) → Refund via PayPal**. Card details are handled entirely by PayPal.

## Launch checklist

- `JWT_SECRET` set to a fresh random value; `ADMIN_PASSWORD` set, and changed after first sign-in.
- SMTP configured, so password resets and order emails are actually delivered.
- `CORS_ALLOWED_ORIGINS` / `FRONTEND_URL` set to the live storefront domain; HTTPS in front of the API.
- `FORWARD_HEADERS_STRATEGY` matches your hosting (rate limits rely on the real client IP).
- Static host serves `frontend/dist/_headers` (or equivalent headers: HSTS, `frame-ancestors 'none'`).
- PayPal live credentials + webhook, and optionally Turnstile keys, once the business accounts exist.
- Run with a single backend instance, or move the in-memory rate limiter to a shared store (e.g. Redis).

## Before launch — replace placeholders

All seeded content is placeholder and editable in **Admin → Site content / Products / Testimonials / FAQs**:
product names, prices and photos (Unsplash), currency (`store` block, GBP by default), contact details,
Instagram link, testimonials (flagged as placeholders), and policy pages (`policyPrivacy`, `policyTerms`, `policyShipping`, `policyReturns`).
PayPal checkout is ready and waits only for credentials (see **PayPal checkout** above).
