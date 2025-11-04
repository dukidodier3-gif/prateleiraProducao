PWA support

O projeto foi preparado para rodar como PWA:

- Plugin: `vite-plugin-pwa` foi adicionado no `vite.config.ts`. Instale as dependências:

  npm install -D vite-plugin-pwa

- Manifest em `public/manifest.webmanifest` criado.
- Service worker simples em `public/sw.js` criado e registrado em `src/main.tsx`.
- Ícones placeholders: adicione `public/pwa-192.png` e `public/pwa-512.png` (ou substitua com suas imagens).

Notas:
- O plugin `vite-plugin-pwa` gera service worker mais avançado (workbox) — atualmente eu adicionei um sw.js simples em `public/` e um manifest; se preferir o plugin totalmente configurado, instale `vite-plugin-pwa` e ajuste `vite.config.ts` (já referenciado).
- Teste em ambiente HTTPS (Vercel fornece HTTPS automaticamente) para que o PWA funcione corretamente no navegador.
