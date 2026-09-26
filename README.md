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

## Deploy pe Cloudflare

Proiectul e pregătit cu `@opennextjs/cloudflare` (Workers).

### Varianta A — din terminal (pe calculatorul tău)

```bash
npm install
npx wrangler login          # deschide browserul, autentifică-te cu contul Cloudflare
npm run deploy              # build + upload pe Workers
```

După deploy primești un URL de tip `https://cali-lab.<contul-tau>.workers.dev`.

### Varianta B — din dashboard (Git)

1. Pune codul pe GitHub (Create repo în Cursor, sau push pe un repo al tău).
2. În [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → conectează repo-ul.
3. Build settings:
   - **Build command:** `npx opennextjs-cloudflare build`
   - **Deploy command:** `npx wrangler deploy` (sau lasă presetul Workers/OpenNext)
4. Deploy.

### Domeniu propriu (ex. cali-lab.ro)

Workers & Pages → proiectul `cali-lab` → **Custom domains** → adaugă domeniul. DNS-ul trebuie să fie pe Cloudflare (sau CNAME către workers.dev).

## Funcționalități (slice livrat)

- Statistici publice, hartă Leaflet/OpenTopoMap, autentificare / înregistrare, GDPR
- Formulare Fenologie, Perturbări, Sol (GPS accuracy/altitudine/oră, specie, 4 clase sol + puieți, tipuri perturbare extinse, comprimare poze)
- Listă observații, detalii, validare ranger, admin + export CSV FAIR
- Footer vizibilitate UE / EFI / FORWARDS / ISV / APNC

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Leaflet · Zustand · Recharts · Cloudflare Workers (OpenNext)
