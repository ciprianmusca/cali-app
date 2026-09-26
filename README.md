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

Proiectul e pregătit cu `@opennextjs/cloudflare`. Subdomeniul **cali.ipsv.ro** este deja în `wrangler.jsonc`.

**Condiție:** zona DNS `ipsv.ro` trebuie să fie pe același cont Cloudflare (nameservere Cloudflare).

### Din terminal (recomandat)

```bash
npm install
npx wrangler login          # autentificare Cloudflare
npm run deploy              # creează Worker-ul + DNS/SSL pentru cali.ipsv.ro
```

Cloudflare creează automat înregistrarea DNS și certificatul SSL pentru `cali.ipsv.ro`. Nu e nevoie să adaugi manual un CNAME.

### Din dashboard (dacă Worker-ul există deja)

1. [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages) → Worker **cali-lab**
2. **Settings** → **Domains & Routes** → **Add** → **Custom Domain**
3. Introdu: `cali.ipsv.ro` → **Add Custom Domain**

URL public: **https://cali.ipsv.ro** (plus `*.workers.dev` pentru test).

## Funcționalități (slice livrat)

- Statistici publice, hartă Leaflet/OpenTopoMap, autentificare / înregistrare, GDPR
- Formulare Fenologie, Perturbări, Sol (GPS accuracy/altitudine/oră, specie, 4 clase sol + puieți, tipuri perturbare extinse, comprimare poze)
- Listă observații, detalii, validare ranger, admin + export CSV FAIR
- Footer vizibilitate UE / EFI / FORWARDS / ISV / APNC

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Leaflet · Zustand · Recharts · Cloudflare Workers (OpenNext)
