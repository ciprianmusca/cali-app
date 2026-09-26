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

### GitLab + Cloudflare (fără deploy local)

Cloudflare nu citește Cursor Origin. Codul trebuie să fie pe **GitLab**, apoi Cloudflare îl construiește la fiecare push.

#### A. Creează proiectul pe GitLab

1. [gitlab.com/projects/new](https://gitlab.com/projects/new)
2. Project name: `cali-app`
3. Visibility: Private (sau Public)
4. **Nu** bifa „Initialize repository with a README”
5. Create project — copiază URL-ul, ex. `https://gitlab.com/<user>/cali-app.git`

#### B. Împinge codul din Origin pe GitLab (o singură dată)

Pe calculatorul tău (sau orice mașină cu git):

```bash
curl -fsSL https://downloads.cursor.com/origin/install.sh | sh
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc

origin auth login
origin repo clone ciprian-musca/cali-app
cd cali-app

git remote add gitlab https://gitlab.com/<user>/cali-app.git
git push -u gitlab main
```

Înlocuiește `<user>` cu userul/grupul tău GitLab. La autentificare folosește un [Personal Access Token](https://gitlab.com/-/user_settings/personal_access_tokens) cu scope `write_repository` (nu parola contului).

#### C. Leagă în Cloudflare

1. Cloudflare → **Create an app** → **Connect with GitLab**
2. Autorizează GitLab → alege proiectul `cali-app`
3. Setări:

| Câmp | Valoare |
|------|---------|
| Worker name | `cali-lab` |
| Production branch | `main` |
| Build command | `npm run cf:build` |
| Deploy command | `npm run cf:deploy` |
| Root directory | (gol) |

4. **Save and Deploy** — Cloudflare face build-ul în cloud.
5. Domeniul `cali.ipsv.ro` e deja în `wrangler.jsonc`; după deploy verifică **Settings → Domains & Routes**.

La fiecare `git push` pe `main` (GitLab), Cloudflare redeploy-uiește automat.

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
