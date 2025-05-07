# Configuração de Ícones PWA para o Treino na Mão

Este documento explica como os ícones do Progressive Web App (PWA) foram configurados para garantir compatibilidade com diferentes dispositivos, especialmente iOS.

## Estrutura de Arquivos

Os ícones e recursos do PWA estão organizados da seguinte forma:

```
public/
├── apple-touch-icon.png (180x180)
├── favicon.ico
├── favicon-16.png
├── favicon-32.png
├── manifest.json
└── icons/
    ├── icon-192x192.png
    ├── icon-512x512.png
    └── ios/
        ├── apple-touch-icon-57x57.png
        ├── apple-touch-icon-60x60.png
        ├── apple-touch-icon-72x72.png
        ├── apple-touch-icon-76x76.png
        ├── apple-touch-icon-114x114.png
        ├── apple-touch-icon-120x120.png
        ├── apple-touch-icon-144x144.png
        ├── apple-touch-icon-152x152.png
        ├── apple-touch-icon-167x167.png
        ├── apple-touch-icon-180x180.png
        └── splash/
            ├── splash-750x1334.png (iPhone SE, 8, 7, 6s, 6)
            ├── splash-828x1792.png (iPhone XR, 11)
            ├── splash-1125x2436.png (iPhone X, XS, 11 Pro, etc.)
            ├── splash-1170x2532.png (iPhone 12, 13, 14)
            ├── splash-1284x2778.png (iPhone Pro Max)
            ├── splash-1536x2048.png (iPad 9.7")
            ├── splash-1668x2388.png (iPad Pro 11")
            └── splash-2048x2732.png (iPad Pro 12.9")
```

## Configuração no Next.js

Os ícones e as telas de inicialização são referenciados em dois locais principais:

1. **app/layout.tsx**: Contém as meta tags, links para os ícones e telas de inicialização
2. **public/manifest.json**: Define os ícones e configurações para o PWA

## Requisitos Específicos para iOS

O iOS tem requisitos específicos para PWAs:

- O arquivo `apple-touch-icon.png` na raiz do site é especialmente importante
- Vários tamanhos de ícones são necessários para diferentes dispositivos iOS
- Tags `<link rel="apple-touch-icon">` com os tamanhos específicos
- Tags `<link rel="apple-touch-icon-precomposed">` para versões mais antigas do iOS
- Telas de inicialização (`apple-touch-startup-image`) com media queries específicas

## Como Atualizar os Ícones

Para atualizar os ícones do PWA:

1. Substitua o arquivo `public/icons/icon-512x512.png` pelo seu novo ícone (mantenha o mesmo nome)
2. Execute os scripts Python para gerar automaticamente todos os tamanhos necessários:

```bash
python3 generate_ios_icons.py    # Gera ícones para iOS
python3 generate_ios_splash.py   # Gera telas de inicialização para iOS
```

3. Execute o script de verificação para confirmar que tudo está correto:

```bash
python3 verify_pwa_assets.py
```

## Solução de Problemas Comuns

### Ícone não aparece na tela inicial do iOS
- Verifique se o arquivo `apple-touch-icon.png` existe na raiz do site
- Confirme que todas as meta tags `apple-mobile-web-app-capable` estão presentes
- Verifique se os arquivos PNG são genuínos (não JPEGs renomeados)

### Tela de inicialização não aparece
- Verifique se as telas de inicialização têm os tamanhos corretos
- Confira se as media queries nas tags `apple-touch-startup-image` correspondem aos dispositivos alvo

### Ícones com aparência incorreta
- Confirme que os arquivos PNG têm transparência adequada
- Verifique se o formato está correto (deve ser PNG genuíno, não JPEG renomeado)

## Scripts de Manutenção

O projeto inclui três scripts Python para facilitar a manutenção dos ícones:

1. **generate_ios_icons.py**: Gera ícones nos tamanhos corretos para iOS
2. **generate_ios_splash.py**: Gera telas de inicialização para vários dispositivos iOS
3. **verify_pwa_assets.py**: Verifica se todos os arquivos necessários existem e estão configurados corretamente 