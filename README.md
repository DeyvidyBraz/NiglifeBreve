# Niglife Breve Page

Estrutura igual ao projeto `Breve-Page`, pronta para GitHub Pages + Firebase.

## Estrutura

- `apps/web` -> landing estatica (HTML/CSS/JS)
- `apps/firebase-functions` -> Cloud Function para receber waitlist
- `firebase.json` -> config de functions + firestore
- `.github/workflows/pages.yml` -> deploy do `apps/web` no GitHub Pages

## Formulario configurado

- `name` (opcional)
- `email` (obrigatorio)
- `phone` (obrigatorio, mascara `(99) 99999-9999`)

## Firestore

Collection usada no frontend e no backend:

- `niglife_waitlist_coming_soon`

Collection de deduplicacao no backend:

- `niglife_waitlist_coming_soon_uniques`

## Rodar web local

```bash
npm run serve:web
```

Acesse `http://localhost:5173`.

## Firebase Functions

1. Instale CLI e faca login.
2. Configure `WAITLIST_ENC_KEY` (base64 de 32 bytes).
3. Rode deploy:

```bash
npm run deploy:functions
```

A function publicada eh `submitNiglifeWaitlist`.
