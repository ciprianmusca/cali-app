# CALI-LAB

Aplicație web (PWA) pentru colectarea observațiilor științifice din Parcul Național Călimani: **Fenologie**, **Perturbări** și **Sol**. Datele sunt validate de rangerii PNC și pot fi exportate anonimizat (FAIR) către ForestWard Observatory (EFI/FORWARDS).

Proiect: CALI-LAB · Grant Agreement G-07-2025-2 · ISV & APNC.

## Rulează local

```bash
npm install
npm run dev
```

Deschide [http://127.0.0.1:43123](http://127.0.0.1:43123).

## Conturi demo

| Rol | Email | Parolă |
|-----|-------|--------|
| Admin | admin@cali-lab.ro | Admin123! |
| Ranger | ranger@cali-lab.ro | Ranger123! |
| Turist | turist@cali-lab.ro | Turist123! |
| Elev | elev@cali-lab.ro | Elev1234! |

Datele sunt stocate local în browser (localStorage) — fără backend. Potrivit pentru demonstrație și testare UI.

## Limbă / Language

Interfața este disponibilă în **română** și **engleză**. Selectorul **RO | EN** este în header (și în meniul mobil). Preferința se salvează în `localStorage` (`cali-locale`).

## Bază de date (Cloudflare D1)

**Sursa de adevăr** este baza **D1** `cali-lab-db` (binding `DB`).

| Unde | Rol |
|------|-----|
| Cloudflare D1 | Date persistente (utilizatori + observații), partajate între dispozitive |
| Browser localStorage | Cache + coadă offline |
| `POST /api/sync` | Upload observații offline → D1 |
| `GET /api/bootstrap` | Descarcă starea din D1 la pornire |

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

## Offline + sync

CALI-LAB e PWA:
- **Service Worker** cache-uiește shell-ul pentru teren fără semnal
- Observațiile se salvează **local imediat**, apoi se încarcă în **D1** când e online
- Bara sub header: Offline / În așteptare / Se încarcă

Pe telefon: deschide o dată online → Adaugă pe ecranul principal.

## Deploy pe Cloudflare → https://cali.ipsv.ro

Proiectul e pregătit cu `@opennextjs/cloudflare`. Subdomeniul **cali.ipsv.ro** este în `wrangler.jsonc`.

**Condiție:** zona DNS `ipsv.ro` trebuie să fie pe același cont Cloudflare.

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
6. Verifică `cali.ipsv.ro` (deja în `wrangler.jsonc`) la **Settings → Domains & Routes**.

La fiecare push pe GitHub `main`, Cloudflare redeploy-uiește automat.

### Alternativ: deploy local cu Wrangler

```bash
npm install
npx wrangler login
npm run deploy
```
## Funcționalități (slice livrat)

- Statistici publice, hartă Leaflet/OpenTopoMap, autentificare / înregistrare, GDPR
- Formulare Fenologie, Perturbări, Sol (GPS accuracy/altitudine/oră, specie, 4 clase sol + puieți, tipuri perturbare extinse, comprimare poze)
- Listă observații, detalii, validare ranger, admin + export CSV FAIR
- Footer vizibilitate UE / EFI / FORWARDS / ISV / APNC

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Leaflet · Zustand · Recharts · Cloudflare Workers (OpenNext)
