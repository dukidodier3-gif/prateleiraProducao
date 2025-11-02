# 🚀 Guia Rápido de Uso

## Iniciar o Sistema

### ⭐ Opção Recomendada - Tudo de uma vez

```bash
npm run dev:all
```

Isso irá iniciar:
- ✅ Frontend em http://localhost:8080
- ✅ Backend em http://localhost:3001

### Opções Separadas

```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend  
cd backend
npm run dev
```

## Funcionalidades Disponíveis

### ✨ Adicionar Peça
1. Clique no botão "Adicionar Peça"
2. Preencha os campos obrigatórios
3. Clique em "Salvar"

### 🔍 Buscar Peças
- Use a barra de busca para filtrar por:
  - Código
  - Número da OP
  - Tipo de componente
  - Localização
  - Status

### ✏️ Editar Peça
1. Clique no ícone de lápis na peça desejada
2. Modifique os campos necessários
3. Clique em "Salvar"

### 🗑️ Remover Peça
1. Clique no ícone de lixeira
2. Confirme a remoção

## Dados Persistidos

Todos os dados são salvos automaticamente no banco SQLite local (`parts.db`).

Os dados permanecem mesmo após:
- Recarregar a página
- Fechar o navegador
- Reiniciar o servidor

## Parar os Servidores

Pressione `Ctrl + C` no terminal onde está rodando `npm run dev:all`

## Verificar se está funcionando

Acesse http://localhost:3001/health

Você deve ver:
```json
{
  "status": "ok",
  "timestamp": "...",
  "message": "API do Sistema de Inventário funcionando"
}
```