# Sistema de Inventário de Engates - Desktop

## Conversão para Aplicativo Desktop

### Opção 1: Electron (Recomendado para facilidade)

#### Instalação Electron
```bash
npm install --save-dev electron electron-builder concurrently wait-on cross-env
```

#### Configuração package.json
```json
{
  "main": "dist-electron/main.js",
  "scripts": {
    "electron": "wait-on http://localhost:5173 && electron .",
    "electron:pack": "electron-builder",
    "electron:dev": "concurrently \"npm run dev\" \"npm run electron\"",
    "electron:build": "npm run build && electron-builder"
  }
}
```

#### Estrutura de arquivos necessária:
```
src/
├── electron/
│   ├── main.ts          # Processo principal Electron
│   ├── preload.ts       # Script de preload para segurança
│   └── database.ts      # Configuração SQLite específica para Electron
```

### Opção 2: Tauri (Mais leve, mais complexo)

#### Instalação Tauri
```bash
npm install --save-dev @tauri-apps/cli
npx tauri init
```

#### Configuração Rust necessária:
- Install Rust: https://rustup.rs/
- Configurar src-tauri/tauri.conf.json

## Status Atual da Implementação

✅ **Banco SQLite configurado** - Usando better-sqlite3
✅ **Hooks TanStack Query** - Integração completa com persistência
✅ **Componentes atualizados** - PartsTable usando dados persistidos
✅ **CRUD Operations** - Create, Read, Update, Delete funcionais

## Próximos Passos para Desktop

### Para Electron:
1. Criar processo principal (`main.ts`)
2. Configurar preload script para segurança
3. Ajustar paths do banco SQLite para userData folder
4. Configurar build para diferentes SO

### Para Tauri:
1. Configurar backend Rust
2. Implementar comandos Tauri para SQLite
3. Configurar permissões de sistema
4. Setup de build multiplataforma

## Considerações Importantes

### Electron Pros:
- Mais fácil de configurar
- Melhor suporte para Node.js modules
- Documentação extensa
- Compatibilidade com better-sqlite3

### Tauri Pros:
- Menor tamanho do executável
- Melhor performance
- Maior segurança
- Mais controle sobre sistema

### Banco de Dados Desktop:
- Pasta userData automática
- Backup/restore de dados
- Migração de schema
- Sincronização opcional com nuvem