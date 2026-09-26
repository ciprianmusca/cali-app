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
| Worker name | `cali-lab` |
| Production branch | `main` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | (gol) |

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
