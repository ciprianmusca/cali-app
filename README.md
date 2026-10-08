# CALI-LAB

Aplicație web (PWA) pentru colectarea observațiilor științifice din Parcul Național Călimani: **Fenologie**, **Perturbări** și **Sol**. Datele sunt validate de rangerii PNC și pot fi exportate anonimizat (FAIR) către ForestWard Observatory (EFI/FORWARDS).

Proiect: CALI-LAB · Grant Agreement G-07-2025-2 · ISV & APNC.

## Rulează local

**Asset-uri:** logo-uri oficiale în `/public/logos/` (ISV, APNC/Călimani, FORWARDS, UE Funded, CALI-LAB). Hero/ghid: `/public/hero-padure.svg`, `/public/guide/*` (placeholdere). Site parc: [calimani.ro](https://calimani.ro). Turnstile: `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` (implicit chei de test).

**Cu D1/R2 (autentificare, sync, validare)** — Cloudflare preview:

```bash
npm install
npm run preview
```

Deschide [http://127.0.0.1:43124](http://127.0.0.1:43124) (sau portul afișat de `wrangler dev`).

**Doar UI Next.js** (fără binding D1 — login API returnează 500):

```bash
npm run dev
```

→ [http://127.0.0.1:43123](http://127.0.0.1:43123).

## Conturi demo

| Rol | Email | Parolă |
|-----|-------|--------|
| Admin | admin@cali-lab.ro | Admin123! |
| Ranger | ranger@cali-lab.ro | Ranger123! |
| Profesor | profesor@cali-lab.ro | Profesor123! |
| Turist | turist@cali-lab.ro | Turist123! |
| Elev | elev@cali-lab.ro | Elev1234! |

Conturile există în D1. **Lista publică** (fără admin) e pe **[/testeaza](/testeaza)** („Testează aplicația”). Observațiile din aceste conturi sunt marcate `isDemo` și **nu apar** pe harta publică, la validarea oficială sau în exportul FAIR.

Pe `/autentificare`, lista demo și câmpurile precompletate apar doar dacă `NEXT_PUBLIC_DEMO_MODE=true`.

## Email (Cloudflare Email Service)

Nu folosim Resend / SMTP raw. Trimiterea e nativă din Worker:

```jsonc
"send_email": [{ "name": "EMAIL", "remote": true }]
```

Vars (în `wrangler.jsonc`):

- `MAIL_FROM=noreply@cali-lab.app`
- `MAIL_FROM_NAME=CALI-LAB`
- `MAIL_REPLY_TO=contact@cali-lab.app`
- `APP_URL=https://cali-lab.app`

**Condiții Cloudflare:** domeniul `cali-lab.app` activat în **Email Service → Email Sending** (Workers Paid), plus DNS (SPF/DKIM/DMARC).

**Secrete de setat:**

```bash
npx wrangler secret put TURNSTILE_SECRET_KEY   # cheia secretă Turnstile (producție)
npx wrangler secret put AUTH_SECRET            # opțional, dacă mutați din vars
```

Local, fără binding EMAIL: mailurile sunt doar **logate în consolă**.

Flux creare cont: user `inactiv` → email `/activare?token=…` (24h) sau activare manuală admin/ranger. Resetare: `/resetare-parola/confirmare?token=…` (60 min), single-use; după reset se invalidează sesiunile JWT (`session_version`).

Anti-abuz: Turnstile pe înregistrare + resetare; max 3 mailuri/oră/email și 10/oră/IP (D1).

Autentificarea rulează pe server (sesiune JWT în cookie `httpOnly`). Parolele sunt stocate cu **PBKDF2** în D1.

## Limbă / Language

Interfața este disponibilă în **română** și **engleză**. Selectorul **RO | EN** este în header (și în meniul mobil). Preferința se salvează în `localStorage` (`cali-locale`).

## Bază de date (Cloudflare D1)

**Sursa de adevăr** este baza **D1** `cali-lab-db` (binding `DB`).

| Unde | Rol |
|------|-----|
| Cloudflare D1 | Date persistente (utilizatori + observații); `photos_json` = chei `r2:…`, fără base64 |
| Cloudflare R2 (`PHOTOS` / `cali-lab-photos`) | Fișiere foto ale observațiilor |
| Browser IndexedDB | Fotografii în coada offline (nu în localStorage) |
| Browser localStorage | Cache + coadă metadata (fără parole, fără base64) |
| `POST /api/auth/login` | Autentificare; setează cookie de sesiune |
| `POST /api/sync` | Upload observații + foto → D1 + R2 (necesită sesiune; „synced” doar la 200) |
| `GET /api/bootstrap` | Stare din D1 filtrată pe rol; migrare foto base64→R2 |
| `GET /api/observations/:id/photo/:i` | Servește foto din R2 cu aceeași regulă de vizibilitate |
| `GET /api/export` | GeoJSON FAIR (vizibilitate pe sesiune) / ZIP+CSV FAIR (doar admin). Query: `full=1`, `includeDetails=1` |
| `GET /api/users` | Director utilizatori — **doar admin** (fără conturi sandbox) |

### Vizibilitate observații (ROL-05 / SEC-04)

O singură regulă pe server (`src/lib/visibility.ts`), folosită de bootstrap, listă, hartă, foto și export:
- **vizitator**: doar aprobate
- **turist / rezident / elev**: aprobate + propriile (orice status)
- **ranger / admin**: toate

### Creare D1 (o singură dată)

1. Cloudflare Dashboard → **Storage & Databases** → **D1** → **Create**
2. Nume: `cali-lab-db`
3. Copiază **Database ID**

## Deploy

```bash
npm run deploy
```

Worker: `cali-lab` pe domeniul `cali-lab.app`.
