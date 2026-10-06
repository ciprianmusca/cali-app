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

Conturile demo sunt **active** doar după acord GDPR (versiunea politicii e salvată pe utilizator). Resetarea parolei folosește `passwordResetMinutesUser` / `passwordResetMinutesAdmin`; fără SMTP, linkul apare în UI (demo).

Autentificarea rulează pe server (sesiune JWT în cookie `httpOnly`). Parolele sunt stocate cu **bcrypt** în D1; API-urile nu returnează niciodată câmpul `password`. Lista de utilizatori (`GET /api/users`) e doar pentru admin.

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
| `GET /api/users` | Director utilizatori — **doar admin** |

### Vizibilitate observații (ROL-05 / SEC-04)

O singură regulă pe server (`src/lib/visibility.ts`), folosită de bootstrap, listă, hartă, foto și export:
- **vizitator**: doar aprobate
- **turist / rezident / elev**: aprobate + propriile (orice status)
- **ranger / admin**: toate

### Creare D1 (o singură dată)

1. Cloudflare Dashboard → **Storage & Databases** → **D1** → **Create**
2. Nume: `cali-lab-db`
3. Copiază **Database ID**
4. În `wrangler.jsonc`, înlocuiește `REPLACE_WITH_D1_DATABASE_ID` cu ID-ul
5. (Opțional) aplică migrările:
   ```bash
   npx wrangler d1 migrations apply cali-lab-db --remote
   ```
   Schema se creează și automat la primul `GET /api/bootstrap`.
6. Commit + push → Workers Builds redeploy

La primul bootstrap, conturile demo se însămânțează în D1 dacă tabela e goală.

### Creare R2 (o singură dată)

1. Cloudflare Dashboard → **R2 Object Storage** → **Create bucket**
2. Nume: `cali-lab-photos`
3. Binding-ul `PHOTOS` este deja în `wrangler.jsonc`
4. Commit + push → Workers Builds redeploy

La `GET /api/bootstrap`, orice `data:` rămas în D1 este mutat automat în R2.

## Offline + sync

CALI-LAB e PWA:
- **Service Worker** cache-uiește shell-ul pentru teren fără semnal
- Observațiile se salvează **local imediat** (foto în IndexedDB), apoi se încarcă în **D1 + R2** când e online
- Bootstrap **îmbină** datele serverului cu observațiile locale nesincronizate (nu suprascrie coada)
- O observație e marcată „synced” doar după răspunsul **200** cu `ids` confirmate
- Bara sub header: Offline / În așteptare / Se încarcă

Pe telefon: deschide o dată online → Adaugă pe ecranul principal.

## Deploy pe Cloudflare → https://cali-lab.app

Proiectul e pregătit cu `@opennextjs/cloudflare`. Domeniile din `wrangler.jsonc`:

| Hostname | Rol |
|----------|-----|
| **cali-lab.app** | domeniu principal |
| **www.cali-lab.app** | alias |

`workers.dev` și `cali.ipsv.ro` nu mai sunt expuse pe Worker.

**Condiție:** zona DNS `cali-lab.app` pe **același** cont Cloudflare ca Worker-ul `cali-lab`.

### Atașare domeniu (după ce zona e Active)

1. Cloudflare → **Workers & Pages** → Worker **cali-lab** → **Settings** → **Domains & Routes**
2. **Add** → **Custom Domain** → `cali-lab.app` (și `www.cali-lab.app` dacă nu e deja din deploy)
3. Sau doar `npm run deploy` / push pe `main` — Wrangler creează DNS + certificat automat pentru pattern-urile cu `custom_domain: true`
4. Verifică: https://cali-lab.app (SSL poate dura câteva minute)

**Atenție:** nu lăsa un CNAME manual pe apex/www care conflictă — Custom Domain gestionează DNS-ul.

### Redirect de pe vechiul domeniu (opțional)

În Cloudflare (zona `ipsv.ro`): **Redirect Rule** `cali.ipsv.ro/*` → `https://cali-lab.app/$1` (301), ca vechile linkuri să ajungă pe domeniul nou.

### GitHub + Cloudflare (fără deploy local)

Cloudflare nu citește Cursor Origin. Codul trebuie să fie pe **GitHub** (`ciprianmusca`), apoi Cloudflare îl construiește la fiecare push.

#### A. Creează repo pe GitHub

1. [github.com/new](https://github.com/new)
2. Owner: `ciprianmusca`
3. Repository name: `cali-app`
4. Private (sau Public)
5. **Nu** bifa „Add a README” / .gitignore / license (repo gol)
6. Create repository

#### B. Împinge codul din Origin pe GitHub (o singură dată)

```bash
curl -fsSL https://downloads.cursor.com/origin/install.sh | sh
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc

origin auth login
origin repo clone ciprian-musca/cali-app
cd cali-app

git remote add github https://github.com/ciprianmusca/cali-app.git
git push -u github main
```

La autentificare GitHub: [Personal Access Token](https://github.com/settings/tokens) cu `repo` (sau login via `gh auth login`).

#### C. Leagă în Cloudflare

1. Cloudflare → **Create an app** → **Continue with GitHub**
2. Dacă `cali-app` nu apare: **Configure** Cloudflare GitHub App → bifează `cali-app` → salvează → refresh
3. Selectează `ciprianmusca/cali-app` → **Next**
4. Setări:

| Câmp | Valoare |
|------|---------|
| Worker name | `cali-lab` (trebuie să coincidă cu `name` din `wrangler.jsonc`) |
| Production branch | `main` |
| Build command | `npm run cf:build` (`build` trebuie să fie `next build`, nu OpenNext) |
| Deploy command | `npx wrangler deploy` |
| Root directory | (gol) |
| GitHub repo | `ciprianmusca/cali-app` |

5. **Save and Deploy** — build în cloud.
6. Verifică **Settings → Domains & Routes**: `cali-lab.app`, `www.cali-lab.app`. Dacă vezi încă `cali.ipsv.ro` sau `*.workers.dev`, șterge-le din dashboard (sau lasă deploy-ul să le scoată).

La fiecare push pe GitHub `main`, Cloudflare redeploy-uiește automat.

### Alternativ: deploy local cu Wrangler

```bash
npm install
npx wrangler login
npm run deploy
```
## Demo AI acoperire sol

Pe formularul **Sol** (`/observatii/nou/sol`), după fotografie: buton **Propune acoperirea (AI)**.

| Mod | Cum |
|-----|-----|
| **Online** | `POST /api/ai/soil-cover` → Workers AI (`@cf/meta/llama-3.2-11b-vision-instruct`), binding `AI` în `wrangler.jsonc` |
| **Offline** | Heuristică pe culori în browser (canvas) — fără rețea |

Sugestia precompletează sliderele; utilizatorul corectează; rangerul validează. În payload se salvează `aiCoverSuggestion` (mode/model/at). Dacă Workers AI lipsește sau eșuează, clientul folosește automat modul offline.

## Funcționalități (slice livrat)

- Statistici publice, hartă Leaflet/OpenTopoMap, autentificare / înregistrare, GDPR
- Formulare Fenologie, Perturbări, Sol (GPS accuracy/altitudine/oră, specie, 4 clase sol + puieți, tipuri perturbare extinse, comprimare poze, demo AI acoperire online/offline)
- Listă observații, detalii, validare ranger, admin + export FAIR (ZIP: CSV + GeoJSON + datapackage/README, CC BY 4.0; pseudonime stabile; specii științifice + GBIF)
- Footer vizibilitate UE / EFI / FORWARDS / ISV / APNC

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Leaflet · Zustand · Recharts · Cloudflare Workers (OpenNext)
