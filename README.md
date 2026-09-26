# CALI-LAB

Aplicație web (PWA) pentru colectarea observațiilor științifice din Parcul Național Călimani: **Fenologie**, **Perturbări** și **Sol**. Datele sunt validate de rangerii PNC și pot fi exportate anonimizat (FAIR) către ForestWard Observatory (EFI/FORWARDS).

Proiect: CALI-LAB · Grant Agreement G-07-2025-2 · ISV & APNC.

## Rulează local

```bash
npm install
npm run dev -- --port 43123
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

## Funcționalități (slice livrat)

- Statistici publice, hartă Leaflet/OpenTopoMap, autentificare / înregistrare, GDPR
- Formulare Fenologie, Perturbări, Sol (cu îmbunătățirile din fișa de testare: GPS accuracy/altitudine/oră, specie, 4 clase sol + puieți, tipuri perturbare extinse, comprimare poze)
- Listă observații, detalii, validare ranger (blocare auto-validare, validare în lot)
- Admin: utilizatori, export CSV FAIR
- Footer vizibilitate UE / EFI / FORWARDS / ISV / APNC (fără „Powered by FivePlus”)

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Leaflet · Zustand · Recharts
