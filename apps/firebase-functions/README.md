# Firebase Functions (Niglife waitlist)

## O que existe

- `submitNiglifeWaitlist` (HTTP Cloud Function)
- Validacao: email e phone obrigatorios; name opcional
- Mascara esperada no phone: `(99) 99999-9999` (backend salva normalizado com 11 digitos)
- Deduplicacao por hash de email e phone
- Criptografia server-side para name/email/phone

## Collections

- waitlist: `niglife_waitlist_coming_soon`
- uniques: `niglife_waitlist_coming_soon_uniques`

## Variaveis de ambiente

- `WAITLIST_ENC_KEY`: base64 de 32 bytes
- `WAITLIST_ALLOWED_ORIGINS` (opcional): origens extras no CORS, separadas por virgula

## Rodar checks

```bash
npm run check --workspace apps/firebase-functions
```

## Deploy

```bash
npm run deploy --workspace apps/firebase-functions
```
