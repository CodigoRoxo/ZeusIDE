# Contribuindo com o Zeus IDE

Obrigado pelo interesse! Este guia mostra como colaborar.

## Antes de começar

- **Bugs:** abra uma [issue de bug](https://github.com/CodigoRoxo/ZeusIDE/issues/new?template=bug.yml) com os passos para reproduzir.
- **Recursos novos:** abra primeiro uma [sugestão](https://github.com/CodigoRoxo/ZeusIDE/issues/new?template=feature.yml) para conversarmos sobre a ideia. Assim ninguém perde tempo com um PR que não encaixa no projeto.
- Procurando por onde começar? Veja as issues marcadas com `good first issue`.

## Rodando localmente

Requisitos: Windows 10/11 e Node.js 22+.

```bash
git clone https://github.com/CodigoRoxo/ZeusIDE.git
cd ZeusIDE
npm install
npm run dev
```

O `npm run dev` compila o processo do Electron, sobe o Vite com hot reload e abre a IDE.

## Como o código está organizado

- `electron/` roda no **processo principal** (Node.js). É o único lugar que acessa disco, terminal e janelas.
- `src/` é a **interface** (React). Ela não tem acesso ao Node e fala com o processo principal só pela API exposta em `electron/preload.ts` (`window.zeusAPI`).
- Para adicionar uma operação nova (ex.: ler algo do disco):
  1. Implemente no serviço em `electron/services/`.
  2. Registre um `ipcMain.handle` em `electron/main.ts`.
  3. Exponha no `electron/preload.ts`.
  4. Tipe em `src/types/electron.d.ts`.

## Enviando um pull request

1. Faça um fork e crie uma branch a partir da `main`, por exemplo `feat/busca-global` ou `fix/aba-renomeada`.
2. Mantenha o PR focado em uma coisa só.
3. Garanta que o build passa:
   ```bash
   npm run build
   ```
4. Use mensagens de commit curtas e no imperativo, de preferência no padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/):
   - `feat: adiciona busca global`
   - `fix: corrige aba ao renomear pasta`
   - `docs: atualiza atalhos no README`
5. Descreva no PR o que mudou e como testar. Prints ou GIFs ajudam muito em mudanças visuais.

## Estilo de código

- TypeScript em tudo. Evite `any`.
- Siga o estilo dos arquivos ao redor: componentes funcionais, hooks e Tailwind usando as cores `zeus-*`.
- Textos da interface em português.

## Publicando uma versão (mantenedores)

```bash
npm version patch      # ou minor / major: atualiza o package.json e cria a tag
git push --follow-tags
```

O GitHub Actions gera o instalador e o portátil e cria um **rascunho** de release. Revise as notas no GitHub e clique em **Publish release**. A partir daí, as cópias instaladas recebem a atualização automaticamente.
