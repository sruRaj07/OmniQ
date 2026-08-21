# Publishing OmniQ to Google Play

**Written 2026-08-20.** Package `com.sruraj.omniq`. Personal developer account.

This is the working checklist for getting OmniQ onto Google Play. Read
[The critical path](#the-critical-path) first — it determines the order of everything else.

---

## The critical path

Your Play developer account is a **personal** account, and it is being created after November 2023.
Google therefore requires:

> **12 testers opted in to a closed test, continuously, for 14 days**, before you may apply for
> production access.

Three consequences worth internalising:

1. **The 14 days is wall-clock time you cannot compress.** Nothing you do in the codebase shortens
   it. The single highest-value action is getting *any* compliant build into closed testing.
2. **The count must not drop below 12 at any point.** If a tester opts out on day 9, the counter
   resets. Recruit 15–16 so there is slack.
3. **Testers must actually opt in via the opt-in link.** Being on the email list is not enough — an
   invited-but-not-opted-in tester does not count.

So the sequence is: finish the blockers → build → upload to closed testing → recruit testers →
**start the clock** → do the polish work during those 14 days → apply for production.

Budget roughly: 1–2 days of work, then 14 days of waiting, then 1–7 days of review.

---

## Status

### Done in this pass

| Item | What changed |
|---|---|
| **Account deletion was completely broken** | `deleteConfirmText` was checked but bound to no input, so the confirm always failed and the mutation never fired. Added the missing input. This alone would have failed review. |
| Deletion copy contradicted behaviour | Said "removed within 30 days", "may be rejected". Deletion is immediate. Rewritten to match. |
| Deletion could be permanently hidden | A leftover `pending` request rendered a "Pending" badge *instead of* the Delete button. Removed — the path must always be reachable. |
| Wrong loading state | Button read `requestMutation.isPending`; the mutation is `deleteAccountMutation`. |
| Fabricated location data | `cart.tsx` sent hardcoded Bangalore coordinates on every order. Removed; `buyerLat`/`buyerLng` are now optional server-side. |
| Location permission | Removed the unused `expo-location` dependency. |
| Manifest permissions | Added `blockedPermissions` for camera, all location variants and microphone. Verified in the generated manifest. |
| Stale root EAS config | Root `app.json`/`eas.json` pointed at a *different* EAS project with no `android.package`. Deleted. |
| Generated native dirs | `frontend/android` and `frontend/ios` are now gitignored. |

Verified against production: migration `005_account_deletion.sql` **is applied**
(`account_deletions` returns `200 []`, versus `404 PGRST205` for a non-existent table), RLS still
denies anonymous reads, and the gateway is healthy.

### Blocking — you must do these

| # | Action | Why |
|---|---|---|
| 1 | **Make the GitHub repo private** | `docs/RESUME_HERE.md` is publicly readable today and describes both security breaches in detail. |
| 2 | **Rotate `SUPABASE_SERVICE_ROLE_KEY`** | Still outstanding from the security pass. It bypasses all RLS. |
| 3 | **Publish the legal site** | See [Legal pages](#legal-pages). Play will not accept the listing without a privacy policy URL. |
| 4 | **Deploy the backend before shipping the app** | See the warning below. |
| 5 | Create the Play developer account (₹2,100 / $25, one-time) | Takes up to 48h to verify. Start it now. |

> [!WARNING]
> **Deploy order matters.** The app no longer sends `buyerLat`/`buyerLng`, but the *currently
> deployed* order-service still requires them (`z.number()`). If the app ships first, every
> checkout fails validation. **Deploy the backend, verify an order goes through, then build the
> AAB.**

---

## Legal pages

`legal-site/` in this repo contains four files: `index.html`, `privacy-policy.html`,
`account-deletion.html`, `terms.html` and `style.css`.

Since the main repo is going private, host these from a **separate public repo** — GitHub Pages
does not serve public sites from private repos on the free plan.

```bash
cd legal-site
git init -b main
git add .
git commit -m "OmniQ legal pages"
gh repo create omniq-legal --public --source=. --push   # or create it in the GitHub UI
```

Then: **repo → Settings → Pages → Source: Deploy from a branch → `main` / `root` → Save.**

Your URLs will be (confirm the exact casing after Pages goes live):

| Purpose | URL |
|---|---|
| Privacy policy | `https://sruraj07.github.io/omniQ-legal/privacy-policy.html` |
| Account deletion | `https://sruraj07.github.io/omniQ-legal/account-deletion.html` |
| Terms | `https://sruraj07.github.io/omniQ-legal/terms.html` |

Verify each returns `200` in a private browser window before pasting them into Play Console.

> The policy text asserts specific things — no location, no camera, no analytics, no payment data,
> Cash on Delivery only. Those were verified against the code on 2026-08-20. **If you later add an
> analytics SDK, a payment gateway or location, the policy and the Data Safety form must be updated
> in the same change.** A Data Safety form that contradicts the app is one of the most common causes
> of suspension.

---

## Building the AAB

```bash
cd frontend
npx eas build --platform android --profile production
```

Notes:

- The `production` profile already emits an **app bundle** (`.aab`), which Play requires. The `apk`
  profile is for sideloading only — do not upload that.
- `autoIncrement: true` bumps `versionCode` on each production build. It is currently `9`; since
  nothing has ever been uploaded to Play, any value works for the first upload. It only has to
  increase from then on.
- **Let EAS generate and keep the upload keystore.** Losing it means you can never update the app.
  Back it up straight away: `npx eas credentials` → Android → download the keystore, and store it
  somewhere you will still have in three years.
- Check the resulting size against the 40MB budget in `CLAUDE.md`. An AAB is smaller than the APK
  users actually download; Play shows the delivered size in the console.

Before uploading, install the build on a real device and walk the full path: sign up → browse →
add to cart → checkout → **delete account**. That last one is what a reviewer will test.

---

## Play Console, in order

### 1. Create the app
**All apps → Create app.** Name `OmniQ`, English (India) or English (US), **App**, **Free**.
Free/paid cannot be changed later.

### 2. App content (the compliance section)

Work through every item under **Policy → App content**. Play blocks rollout — even to closed
testing — until they are all green.

**Privacy policy** — paste the URL above.

**Ads** — *No*, the app contains no ads. (`manage-ads.tsx` is an internal admin tool for
merchandising banners, not third-party advertising. There is no ad SDK.)

**App access** — the app requires sign-in, so you **must** provide working credentials or the
reviewer will reject it as unusable. Add instructions like:

> All functionality requires an account. You can register a new buyer account with any email
> address; no verification code is required. A demo buyer account is provided below.
> To review the account deletion flow, use Profile → Data & Privacy → Delete Account.

Create a **dedicated demo buyer account** for this. Do not use a real one — the reviewer may delete
it while testing deletion.

**Content rating** — complete the questionnaire. For OmniQ the honest answers give **Rated for 3+ /
Everyone**:

| Question | Answer |
|---|---|
| Category | Commerce / Shopping |
| Violence, sexual content, profanity, drugs, gambling | No to all |
| User-generated content shared with others | **Yes** — sellers upload product listings and images |
| Does the app let users interact or exchange content? | No direct messaging between users |
| Shares user location | **No** |
| Allows purchase of digital goods | No |

**Target audience** — select **18 and over** only. This matches the Terms, and keeps you out of the
Families policy programme and its extra requirements.

**Data safety** — the big one. Exact answers in the next section.

**Government apps** — No. **Financial features** — No (Cash on Delivery is not a financial feature;
there is no payment processing in the app). **Health** — No.

### 3. Store listing

**App name** (30 chars max):
```
OmniQ
```

**Short description** (80 chars max):
```
Shop from local sellers near you. Cash on delivery, fair prices, fast dispatch.
```

**Full description** (4000 chars max):
```
OmniQ is an online marketplace that connects you directly with independent local sellers.

Browse products from sellers in your area, add them to your cart, and pay in cash when your order
arrives at your door. No cards, no wallets, no online payment required.

WHY OMNIQ

• Cash on Delivery — pay only when your order reaches you
• Local sellers — buy from real businesses near you, not a faceless warehouse
• Clear prices in Indian Rupees, with delivery charges shown before you confirm
• Serviceability check — enter your PIN code and know instantly whether we deliver to you
• Track every order from confirmation through dispatch to delivery
• Built to be light and fast, even on an entry-level phone and a patchy connection

FOR BUYERS

Search and browse products by category. Save your delivery address once and reuse it at checkout.
Review your full order history at any time. Cancel an order yourself before it is dispatched.

FOR SELLERS

OmniQ includes a complete seller portal. List products with photos and prices, manage your stock,
receive and confirm orders, and track your sales — all from the same app, with no separate
software to install.

YOUR PRIVACY

We ask only for what is needed to deliver your order: your name, phone number and address. We do
not track your location, we do not use your camera, and we do not run advertising or analytics
software. We never sell your data.

You can delete your account and personal data permanently from inside the app at any time, from
Profile → Data & Privacy. Deletion is immediate — there is no waiting period.

Privacy policy: https://sruraj07.github.io/omniQ-legal/privacy-policy.html

SUPPORT

Questions or problems? Email srusinha092@gmail.com and we will get back to you.
```

**Category:** Shopping. **Tags:** shopping, marketplace, e-commerce.
**Contact email:** `srusinha092@gmail.com`.

### 4. Graphics you need to produce

These are the only hard blockers left that I cannot generate for you.

| Asset | Spec | Status |
|---|---|---|
| App icon | 512×512 PNG, 32-bit, **no transparency** | **Generated** → `play-assets/play-store-icon-512.png`. Technically valid, but see the warning below. |
| Feature graphic | 1024×500 PNG/JPG, no transparency | **You must create this.** Required — Play will not let you publish without it. Keep text large; it renders small. |
| Phone screenshots | **2–8**, 16:9 or 9:16, min 320px, max 3840px | **You must capture these.** Best set: home/browse, product detail, cart, order tracking, seller portal. |
| 7-inch & 10-inch tablet screenshots | Optional | Skip unless you want tablet distribution. |

Screenshots must show the actual app — mockups with invented UI get rejected.

> [!WARNING]
> **The icon artwork has an app-icon shape baked into it.** All three files in
> `frontend/assets/images/` are the same 1024×1024 image: a purple bag-and-Q logo sitting inside a
> white rounded square, with a margin and a drop shadow around it.
>
> That causes two visible problems:
>
> - **Store icon** — Google applies its own rounded mask on top, so you get an icon inside an icon,
>   with the baked-in shadow showing as a grey ring.
> - **Launcher icon** — this is the worse one. Android adaptive icons crop the foreground to roughly
>   the inner 66% of the canvas. This artwork is *already* inset, so on a real device the logo
>   renders small, floating in the white `backgroundColor`, with shadow edges clipped.
>
> Neither will get you rejected, but both look unfinished on a phone. The fix is to supply
> **full-bleed** artwork — the purple gradient extending edge to edge, with the white bag-and-Q
> centred and no rounding, no margin and no shadow — as `icon.png` and `adaptive-icon.png`, and set
> `adaptiveIcon.backgroundColor` to the brand purple rather than `#FFFFFF`. Android and Play each
> apply their own shape. Worth doing during the 14-day tester window if not before.

---

## Data Safety form — exact answers

Derived from an audit of the code on 2026-08-20. **Answer exactly this.**

**Does your app collect or share any of the required user data types?** → **Yes**

For every type below: **Collected = Yes, Shared = Yes** (sellers receive buyer contact details to
fulfil orders — this counts as sharing), **Processed ephemerally = No**,
**Required or optional = Required**, **Purposes = App functionality, Account management**.

| Category | Type | Collected | Shared | Notes |
|---|---|---|---|---|
| Personal info | Name | Yes | Yes | Given to the seller for delivery |
| Personal info | Email address | Yes | No | Account identity |
| Personal info | Phone number | Yes | Yes | Given to the seller for delivery |
| Personal info | Address | Yes | Yes | Given to the seller for delivery |
| Photos and videos | Photos | Yes | Yes | **Sellers/admins only**, and only images they explicitly pick |
| App activity | Purchase history | Yes | Yes | Orders are visible to the seller who fulfils them |

**Answer NO to everything else**, in particular:

- **Location** — precise *and* approximate. Verified: no location permission in the manifest,
  `expo-location` removed, hardcoded coordinates deleted.
- **Financial info** — no payment, card or bank data. Cash on Delivery only.
- **App activity → app interactions, search history, installed apps**
- **Device or other IDs** — no advertising ID, no analytics SDK
- **Crash logs / diagnostics** — no crash reporting SDK
- **Contacts, calendar, messages, audio, health, fitness, files and docs**

**Security practices:**

| Question | Answer |
|---|---|
| Is data encrypted in transit? | **Yes** — HTTPS/TLS on all traffic |
| Can users request data deletion? | **Yes** |
| Deletion URL | `https://sruraj07.github.io/omniQ-legal/account-deletion.html` |
| Have you committed to the Play Families policy? | No |
| Independent security review? | No |

---

## Closed testing — starting the clock

1. **Testing → Closed testing → Create track** (or use the default "Alpha").
2. Upload the AAB. Add release notes.
3. **Testers → Create email list.** Add **15–16** addresses to have slack above the 12 minimum.
4. Save, then **roll out the release**.
5. Copy the **opt-in URL** and send it to every tester. Chase them until at least 12 have actually
   opted in and installed — the console shows the opted-in count.
6. **Day 0 is when you have 12 opted-in testers.** Note the date.

During the 14 days, ask testers to genuinely use the app — install it, place orders, and leave it
installed. Google looks at whether the test was real. Collect their feedback; you will be asked
about it in the production application.

Use the waiting period for the deferred work in
[`docs/RESUME_HERE.md`](RESUME_HERE.md) — the `minReplicas: 0` cold starts (26s measured) are the
most user-visible thing left, and testers will notice them.

---

## Applying for production

After 14 continuous days with 12+ testers: **Play Console → Production → Apply for access.**

You will be asked to describe how you ran the test, what feedback you received, and what you
changed as a result. Answer concretely — vague answers get bounced. Review typically takes a few
days.

Then **Production → Create release**, upload (or promote) the AAB, set the rollout percentage —
**start at 20%**, not 100% — and submit.

---

## Recurring obligations

- **Target API level.** Play raises the minimum every August. Expo SDK 56 is current today; expect
  to ship a rebuild each year to stay compliant.
- **Data Safety accuracy.** Re-check the form on every release that adds a dependency. This is the
  single most common cause of enforcement action against small apps.
- **Account deletion must keep working.** It is now the one flow that is both legally required and
  easy to break silently — it broke once already. Test it on every release.
