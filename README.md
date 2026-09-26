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

### GitHub + Cloudflare (recomandat)

1. În Cursor, creează repo GitHub (**Create repo**), dacă încă nu există.
2. În Cloudflare: **Create an app** → **Continue with GitHub** → autorizează contul → alege repo-ul `cali-lab` (sau numele ales).
3. Setări de build (important):

| Câmp | Valoare |
|------|---------|
| Project / Worker name | `cali-lab` (trebuie să coincidă cu `name` din `wrangler.jsonc`) |
| Production branch | `main` |
| Build command | `npm run cf:build` |
| Deploy command | `npm run cf:deploy` |
| Root directory | `/` (gol / rădăcină) |

4. **Save and Deploy**.
5. După primul deploy reușit: Worker → **Settings** → **Domains & Routes** → **Custom Domain** → `cali.ipsv.ro`  
   (sau lasă Wrangler să-l creeze automat din `wrangler.jsonc` la deploy).

Nu adăuga manual un CNAME pentru `cali` — Custom Domain gestionează DNS + SSL.

### Din terminal (fără GitHub)

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
