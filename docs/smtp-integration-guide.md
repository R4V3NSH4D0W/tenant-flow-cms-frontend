# SMTP Integration Guide

This guide covers the full lifecycle of SMTP email integration in this project — from how credentials are stored and encrypted on the backend, to the public form-submission endpoint that dispatches emails, to the CMS dashboard UI that manages settings.

---

## Architecture Overview

The SMTP system has three distinct layers:

1. **Credential Storage** — Project-level SMTP settings are encrypted at rest in the central control database (`Project` model). The raw password is never stored; only its AES-256-GCM ciphertext is saved.
2. **Mail Dispatch Service** — A shared `mail-service.ts` library compiles Handlebars-style (`{{variable}}`) email templates and sends them via Nodemailer on every form submission.
3. **Dashboard UI** — The `ProjectSmtpSettingsCard` component lets project managers configure and test SMTP credentials without ever exposing the stored password to the browser.

---

## Backend

### Key files

| File | Responsibility |
|---|---|
| `projects-backend/src/lib/smtp-crypto.ts` | AES-256-GCM encryption / decryption of SMTP passwords |
| `projects-backend/src/lib/mail-service.ts` | Template compilation, `nodemailer` transport, email dispatch |
| `projects-backend/src/routes/admin/projects.ts` | Admin REST API routes (`GET`, `PATCH`, `POST /smtp/test`) |
| `projects-backend/src/routes/cms.ts` | Public form submission endpoint that triggers email dispatch |

---

### Step 1: Encryption — `smtp-crypto.ts`

Passwords are never stored in plain text. Each save uses a freshly generated random salt + IV pair so that encrypting the same password twice produces different ciphertext.

```ts
// Encrypt before saving to DB
import { encrypt } from "../../lib/smtp-crypto.js";

const ciphertext = encrypt("my-app-password");
// => "a3f2...:<iv>:<encrypted>:<authTag>"  (colon-delimited hex)
```

**Required environment variable:**

```env
# projects-backend/.env
SMTP_ENCRYPTION_KEY=your-random-secret-at-least-32-chars
```

> If `SMTP_ENCRYPTION_KEY` is absent, the service falls back to a hard-coded dev constant. **Always set this in production.** Generate a key with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

The algorithm is `aes-256-gcm` with PBKDF2 key derivation (10,000 iterations, SHA-256). Decryption is called transparently at dispatch time — the decrypted password is never logged or returned to the browser.

---

### Step 2: Mail Dispatch — `mail-service.ts`

#### Template compilation

Subject lines and HTML body templates support `{{double-brace}}` placeholders. Two special variables are always available regardless of the form schema:

| Variable | Value |
|---|---|
| `{{form_name}}` | The human-readable name of the form definition |
| `{{all_fields}}` | Auto-generated zebra-striped HTML table of all submitted field values |
| `{{any_field_key}}` | The raw submitted value for that specific field key (e.g. `{{email}}`, `{{message}}`) |

```ts
import { compileTemplate } from "./mail-service.js";

const html = compileTemplate(
  "<p>Hi, you submitted: {{message}}</p>{{all_fields}}",
  { message: "Hello world", email: "user@example.com" },
  formDef.schema
);
```

#### Default templates

If a form definition has no custom templates, two built-in defaults are used automatically:

- **`DEFAULT_RECEIVER_TEMPLATE`** — Admin notification. Sent to `smtpEmail` (the configured sender address).
- **`DEFAULT_SENDER_TEMPLATE`** — Guest auto-reply. Sent to the value of any field named `email`, `e-mail`, `Email`, or `EMAIL` in the submission payload.

#### Dispatch function

`sendFormEmails` is always called **fire-and-forget** (`void promise.catch(...)`) from the submission handler so that email failures never block the 200 OK response to the visitor.

```ts
// Called in: routes/cms.ts after saving the submission
sendFormEmails(controlProject, formDef, payload).catch((err) => {
  appLogger.error({ err, projectSlug, formKey }, "Background email dispatch failed");
});
```

The function:
1. Calls `getSmtpConfig(project)` — decrypts the stored password, builds a Nodemailer transport config.
2. Sends the **admin notification** to `project.smtpEmail`.
3. Looks for an `email`-like key in the payload. If found, sends the **guest auto-reply** to that address.
4. Both sends are independent `try/catch` blocks — a failed admin notification will not suppress the guest reply.

---

### Step 3: Admin REST API — `routes/admin/projects.ts`

All three routes require the `requireProjectManagerOrAdmin` middleware.

#### `GET /api/v1/admin/projects/:projectSlug/smtp`

Returns current SMTP settings. **The password is never returned** — only a boolean `hasPassword` flag.

```jsonc
// 200 OK
{
  "success": true,
  "smtp": {
    "smtpEmail": "notify@example.com",
    "smtpHost": "smtp.gmail.com",
    "smtpPort": 587,
    "hasPassword": true   // password exists but is not returned
  }
}
```

#### `PATCH /api/v1/admin/projects/:projectSlug/smtp`

Updates one or more SMTP fields. All body fields are optional — omit a field to leave it unchanged.

```jsonc
// Request body (all fields optional)
{
  "smtpEmail": "notify@example.com",
  "smtpHost": "smtp.gmail.com",
  "smtpPort": 587,
  "smtpPassword": "my-app-password"   // plain text — encrypted before saving
}
```

- Sending `smtpPassword: null` or `smtpPassword: ""` clears the stored password.
- The response mirrors `GET` — only `hasPassword` is returned, never the password itself.
- The action is recorded in the project audit log under `changes: ["smtp_settings"]`.

#### `POST /api/v1/admin/projects/:projectSlug/smtp/test`

Dry-runs an SMTP connection without saving. Accepts the same body fields as `PATCH`. Any field omitted falls back to the currently saved project value, so you can test with just an updated password:

```jsonc
// Test with a new password without saving
{ "smtpPassword": "new-app-password" }
```

Returns `200 OK` with `{ "success": true, "message": "SMTP connection verified successfully" }` on success, or `400` with an error message on failure (e.g. wrong credentials, host unreachable).

---

### Step 4: Public Form Submission — `routes/cms.ts`

The public submission endpoint is tenant-routed via the `x-tenant-slug` header or subdomain:

```
POST http://{project-slug}.localhost:4000/api/v1/forms/{formKey}/submit
Content-Type: application/json

{ "email": "visitor@example.com", "message": "Hello!" }
```

**Execution flow:**

1. Resolve tenant from subdomain → find `project` in control DB + `tenantPrisma` for the project DB.
2. Look up `CmsFormDefinition` by `formKey` in the project (tenant) database.
3. Validate all `required: true` schema fields. Returns `400` for any missing field.
4. Save a `CmsFormSubmission` record to the tenant database.
5. Fire-and-forget `sendFormEmails(controlProject, formDef, payload)`.
6. Return `{ success: true, submissionId: "..." }`.

> SMTP failures are caught and logged — they never cause a `5xx` response to the visitor.

---

## Frontend (CMS Dashboard)

### Key files

| File | Responsibility |
|---|---|
| `cms/components/dashboard/projects/smtp-settings.tsx` | SMTP settings card (split-component pattern) |
| `cms/lib/projects/api.ts` | `projectsApi.getSmtp`, `updateSmtp`, `testSmtp` API calls |
| `cms/app/dashboard/cms/forms/page.tsx` | Forms list that embeds the settings card |

---

### Component Architecture — Split-Component Pattern

`ProjectSmtpSettingsCard` uses the **split-component pattern** to avoid `useEffect` cascading renders (a known React performance anti-pattern):

```
ProjectSmtpSettingsCard (outer shell)
  ├── useQuery: fetches current SMTP config
  ├── Shows loading spinner while fetching
  └── Renders SmtpSettingsForm once data is ready
        └── useState initialized directly from props — no useEffect needed
```

**Why this matters:**

```tsx
// ❌ Anti-pattern — 4 setState calls in useEffect = 4 cascading renders
useEffect(() => {
  if (data?.smtp) {
    setEmail(data.smtp.smtpEmail || "");  // render 1
    setHost(data.smtp.smtpHost || "");    // render 2
    setPort(String(data.smtp.smtpPort));  // render 3
    setPassword("");                       // render 4
  }
}, [data]);

// ✅ Correct — state initialized once, zero extra renders
function SmtpSettingsForm({ initial }: { initial: SmtpInitial }) {
  const [email, setEmail] = useState(initial.email);
  const [host, setHost] = useState(initial.host);
  const [port, setPort] = useState(initial.port);
  // ...
}
```

The outer shell passes `key={projectSlug}` to `SmtpSettingsForm` so that switching projects fully remounts the form with fresh state, preventing stale data from leaking across project contexts.

---

### Step 5: Adding the Card to a Page

The card is self-contained and renders its own data fetch + form. It only requires the project slug and a permission flag:

```tsx
import { ProjectSmtpSettingsCard } from "@/components/dashboard/projects/smtp-settings";

// Inside any dashboard page component:
<ProjectSmtpSettingsCard
  projectSlug={currentProject.slug}
  canManage={isAdmin || currentAccess?.canManageProject === true}
/>
```

Currently embedded in: `cms/app/dashboard/cms/forms/page.tsx` (accessible via the ⚙ Settings icon on the Forms listing page).

---

### Step 6: API Client — `lib/projects/api.ts`

The three API methods used by the settings card:

```ts
projectsApi.getSmtp(projectSlug)
// GET /api/v1/admin/projects/:slug/smtp
// Returns: { smtp: { smtpEmail, smtpHost, smtpPort, hasPassword } }

projectsApi.updateSmtp(projectSlug, {
  smtpEmail: "notify@example.com",
  smtpHost: "smtp.gmail.com",
  smtpPort: 587,
  smtpPassword: "app-password",  // optional — omit to leave unchanged
})
// PATCH /api/v1/admin/projects/:slug/smtp

projectsApi.testSmtp(projectSlug, {
  smtpEmail: "notify@example.com",
  smtpHost: "smtp.gmail.com",
  smtpPort: 587,
  smtpPassword: "app-password",  // optional — falls back to saved value
})
// POST /api/v1/admin/projects/:slug/smtp/test
```

---

## Email Template Reference

Templates are plain HTML strings stored per-form in `CmsFormDefinition.emailTemplateReceiver` and `emailTemplateSender`. Both subjects and bodies support `{{placeholder}}` substitution.

### Available placeholders

| Placeholder | Description |
|---|---|
| `{{form_name}}` | The form's display name (e.g. `"Contact Us"`) |
| `{{all_fields}}` | Full zebra-striped HTML table of every submitted field |
| `{{email}}` | Value of the `email` field (or any field key) |
| `{{message}}` | Value of the `message` field (or any field key) |
| `{{<field_key>}}` | Any field key defined in the form schema |

### Example custom receiver template

```html
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>New inquiry from {{form_name}}</h2>
  <p><strong>From:</strong> {{email}}</p>
  <p><strong>Message:</strong> {{message}}</p>
  {{all_fields}}
  <hr />
  <p style="color: #888; font-size: 12px;">Automated notification — do not reply.</p>
</div>
```

### Example custom sender (auto-reply) template

```html
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>We received your message!</h2>
  <p>Hi there,</p>
  <p>Thank you for submitting <strong>{{form_name}}</strong>. We'll be in touch shortly.</p>
  <p>Here's what you sent us:</p>
  {{all_fields}}
</div>
```

> Leave both templates blank to use the built-in default designs.

---

## Verification Checklist

1. **Environment variable set:**
   ```bash
   echo $SMTP_ENCRYPTION_KEY  # must not be empty in production
   ```

2. **Test connection from the dashboard:**  
   Navigate to **Forms → ⚙ Settings**, fill in your SMTP credentials, click **Test Connection** before saving.

3. **Check backend logs on submission:**  
   After a form is submitted, look for log lines:
   ```
   Successfully sent admin notification email.
   Successfully sent auto-reply confirmation email.
   ```
   or failure lines that will indicate the root cause.

4. **Gmail users:** Use an [App Password](https://support.google.com/accounts/answer/185833), not your account password. 2FA must be enabled on the Google account.

5. **Port guidance:**
   - `587` — STARTTLS (recommended for most providers)
   - `465` — SSL/TLS (`secure: true` is auto-set when port is 465)
   - `25` — Unencrypted (avoid in production)

6. **Audit log:** Every `PATCH /smtp` call is written to the project audit log. Check **Admin → Audit** to confirm saves are reaching the backend.
