<p align="center">
  <img src="../icon/icon2048.png" alt="PlainTab Logo" width="92">
</p>

<h1 align="center">PlainTab</h1>

<p align="center">
  Uma nova guia rápida, silenciosa e centrada em papéis de parede para Chrome e Edge.
</p>

<p align="center">
  <a href="../README.md">English</a> · <a href="https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo">Chrome Web Store</a> · <a href="https://plaintab.kaininx.workers.dev">Demo online</a> · <a href="technical/README_en.md">Notas técnicas</a> · <a href="changelog-i18n/pt_BR.txt">Changelog</a>
</p>

<p align="center">
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" alt="Licença MIT"></a>
  <img src="https://img.shields.io/badge/version-3.2.1-111827?style=flat-square" alt="Versão 3.2.1">
  <img src="https://img.shields.io/badge/Manifest-V3-4285f4?style=flat-square&logo=googlechrome" alt="Manifest V3">
  <img src="https://img.shields.io/badge/No_Build_Step-00a884?style=flat-square" alt="Sem build">
  <img src="https://img.shields.io/badge/Vanilla-JS-f7df1e?style=flat-square&logo=javascript&logoColor=111827" alt="JavaScript puro">
</p>

<div align="center">
  <img src="../imgs/chrome_01.png" width="45%" alt="Captura do PlainTab 1" />
  <img src="../imgs/chrome_02.png" width="45%" alt="Captura do PlainTab 2" />
  <br>
  <img src="../imgs/chrome_03.png" width="45%" alt="Captura do PlainTab 3" />
  <img src="../imgs/chrome_04.png" width="45%" alt="Captura do PlainTab 4" />
</div>

## O que é o PlainTab

PlainTab é uma extensão Manifest V3 para a nova guia do Chrome e do Edge. Ela troca a página padrão por um papel de parede limpo, uma barra de busca configurável e atalhos que ficam guardados até você precisar deles.

É feito para quem quer uma página inicial calma e imediata: sem feed de notícias, cartões promovidos, contas ou painéis cheios de widgets. Abra uma guia, veja o papel de parede, pesquise ou digite uma URL e siga em frente.

A mesma página também roda como site independente abrindo `index.html`, então o projeto é fácil de testar, ler e modificar.

## Experimente

### Instalar

[Instale o PlainTab pela Chrome Web Store](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)

### Demo online

[plaintab.kaininx.workers.dev](https://plaintab.kaininx.workers.dev)

### Rodar localmente

```bash
git clone https://github.com/kaininx/PlainTab.git
```

Modo extensão:

1. Abra `chrome://extensions`.
2. Ative o modo de desenvolvedor.
3. Escolha "Carregar sem compactação".
4. Selecione a pasta do projeto PlainTab.

Modo web:

Abra `index.html` diretamente no navegador.

Sem dependências, sem gerenciador de pacotes e sem etapa de build.

## Por que PlainTab

### Papel de parede primeiro, menos tela em branco

PlainTab cuida da sensação de abrir uma nova guia e ver algo imediatamente. Ele guarda uma prévia leve em `localStorage` e deixa o carregamento completo, cache e cores do tema para depois da primeira pintura.

Velocidade percebida é parte da experiência, não só um número de benchmark.

### Calmo por padrão

A página mantém o essencial: papel de parede, busca e poucos controles. Atalhos, links ocultos, configurações, backups e opções avançadas existem, mas não ocupam a tela inicial.

### Papéis de parede flexíveis

Use o papel de parede diário do Bing, Wallhaven, imagens enviadas, uma pasta local, feeds RSS, uma API própria de imagens ou papéis de parede em vídeo. Simples para o dia a dia, flexível para quem gosta de ajustar tudo.

### Busca e atalhos sem bagunça

A barra de busca permite ajustar posição, tamanho, raio, transparência, visibilidade, histórico e mecanismo de busca. Os atalhos ficam na paleta de comandos, onde você pode buscar, adicionar, editar, importar e ocultar links.

## Recursos

| Recurso | O que faz |
|---------|-----------|
| Nova guia | Substitui a nova guia do navegador após a instalação |
| Modo web independente | Roda por `index.html` sem empacotar a extensão |
| Início rápido do papel de parede | Reduz flashes brancos com uma prévia inicial |
| Papel de parede Bing | Suporta o papel de parede diário do Bing |
| Papel de parede Wallhaven | Suporta navegação e configuração via Wallhaven |
| Papéis locais | Uploads, galeria e seleção de pasta local |
| RSS / API | Conecta feeds e APIs personalizadas de imagens |
| Vídeo | Permite usar vídeos como papel de parede |
| Barra de busca | Posição, tamanho, estilo, transparência e visibilidade |
| Histórico de busca | Salva buscas recentes ou pode ser desligado |
| Paleta de comandos | Gerencia atalhos sem poluir a página inicial |
| Espaço oculto | Links disponíveis, mas fora da vista |
| Painel de ajustes | Interface, papéis, atalhos, dados e idioma |
| Backup e restauração | Importação, exportação e backups criptografados |
| Interface multilíngue | Inclui 16 pacotes de idioma |
| Registro de colaboração com IA | Notas e documentos do desenvolvimento assistido por IA |

<div align="center">
  <img src="../imgs/chrome_05.png" width="45%" alt="Captura das configurações do PlainTab 1" />
  <img src="../imgs/chrome_06.png" width="45%" alt="Captura das configurações do PlainTab 2" />
</div>

## Para desenvolvedores

PlainTab usa tecnologia simples de propósito:

- JavaScript puro, CSS e APIs do navegador.
- Sem `npm`, `package.json`, framework ou bundler.
- Uma base de código para extensão e modo web.
- Configuração Manifest V3 em `manifest.json`.
- Scripts carregados diretamente por `index.html`.

Comece por:

- [Notas técnicas](technical/README_en.md) para arquitetura e responsabilidades.
- [Notas de versão](RELEASE_NOTES.md) para histórico de recursos.
- [Diagnóstico de memória e armazenamento](ai-tasks/20260519-memory-storage-diagnostic-report.md) para o cache de papéis.
- [Instruções para agentes de IA](../AGENTS.md) para regras do projeto.

Áreas sensíveis: caminho de inicialização, renderização em duas camadas, dados grandes no IndexedDB, compatibilidade de chaves localStorage e permissões esperadas pela Chrome Web Store.

## Estrutura do projeto

```text
PlainTab/
├── index.html              # Nova guia e entrada web
├── manifest.json           # Manifesto Chrome / Edge
├── css/                    # Estilos por recurso
├── js/                     # Módulos runtime
├── js/wallpaper/           # Papéis, fontes e extração de tema
├── wasm/                   # Motor de tema e scripts de build
├── _locales/               # Mensagens i18n da extensão
├── docs/                   # Documentação e notas de versão
├── icon/                   # Ícones
└── imgs/                   # Capturas e materiais da loja
```

## O que o PlainTab evita

PlainTab continuará contido. Não fazem parte da direção atual: feeds de notícias, tendências, recomendações, anúncios, cartões patrocinados, grandes painéis de clima/calendário/tarefas, contas, recursos sociais, fluxos em nuvem, dezenas de atalhos fixos ou conteúdo promocional em reprodução automática.

Uma versão para Safari não está planejada por enquanto, pois publicação e manutenção seriam pesadas demais para um projeto pessoal.

## Colaboração com IA e aprendizado

PlainTab foi desenvolvido com bastante colaboração de IA em código, documentação, refatoração, preparação de versões e diagnósticos. Não é uma demo: tem interface real, configurações persistentes, importação/exportação, armazenamento de papéis, vários idiomas e modos extensão/web.

Ele serve para estudar extensões de nova guia, organização de frontend pequeno sem framework, documentação de desenvolvimento assistido por IA e como decisões de produto influenciam decisões técnicas.

## Roadmap

Possíveis próximos passos: fontes de papéis mais estáveis, fluxos de configuração mais suaves, documentação técnica mais clara, registro mais completo de desenvolvimento assistido por IA e possível suporte ao Firefox se APIs e manutenção permitirem.

## Contribuindo

Issues e pull requests são bem-vindos, especialmente sobre compatibilidade de navegadores, fontes de papéis, documentação e pequenos refinamentos de UI.

Antes de alterar inicialização, papéis de parede, armazenamento, busca, configurações ou paleta de comandos, leia [AGENTS.md](../AGENTS.md) e as regras em `.claude/rules/`. A abertura do PlainTab é sensível; prefira mudanças pequenas e focadas.

## Idiomas

<details>
<summary>Traduções do README</summary>

- [English](../README.md)
- [简体中文](README_zh-CN.md)
- [繁體中文](README_zh-TW.md)
- [हिन्दी](README_hi.md)
- [Español](README_es.md)
- [العربية](README_ar.md)
- [Français](README_fr.md)
- Português
- [Русский](README_ru.md)
- [Deutsch](README_de.md)
- [日本語](README_ja.md)
- [Italiano](README_it.md)
- [Türkçe](README_tr.md)
- [Tiếng Việt](README_vi.md)
- [한국어](README_ko.md)
- [Polski](README_pl.md)

</details>

## Links relacionados

- [Changelog](changelog-i18n/pt_BR.txt)
- [Notas de versão detalhadas](RELEASE_NOTES.md)
- [Notas técnicas](technical/README_en.md)
- [Diagnóstico de memória e armazenamento](ai-tasks/20260519-memory-storage-diagnostic-report.md)
- [Demo online](https://plaintab.kaininx.workers.dev)
- [Chrome Web Store](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)
- [GitHub](https://github.com/kaininx/PlainTab)

## Licença

PlainTab é open source sob a [licença MIT](../LICENSE).

Criado e mantido por [Kaelri](https://github.com/kaininx).
