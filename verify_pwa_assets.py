#!/usr/bin/env python3
import os
import json
from pathlib import Path

def verify_pwa_assets():
    print("Verificando ativos do PWA para iOS...")
    
    # Verificar a existência do manifest.json
    if not os.path.exists('public/manifest.json'):
        print("❌ Arquivo manifest.json não encontrado!")
        return False
    
    # Verificar se o apple-touch-icon.png existe na raiz
    if not os.path.exists('public/apple-touch-icon.png'):
        print("❌ Arquivo apple-touch-icon.png não encontrado na raiz!")
        return False
    else:
        print("✅ Arquivo apple-touch-icon.png encontrado na raiz")
    
    # Verificar os ícones iOS
    ios_icons_path = 'public/icons/ios'
    if not os.path.exists(ios_icons_path):
        print(f"❌ Diretório {ios_icons_path} não encontrado!")
        return False
    
    # Tamanhos esperados para ícones iOS
    ios_sizes = [
        (57, 57), (60, 60), (72, 72), (76, 76), 
        (114, 114), (120, 120), (144, 144), 
        (152, 152), (167, 167), (180, 180)
    ]
    
    for width, height in ios_sizes:
        icon_path = f"{ios_icons_path}/apple-touch-icon-{width}x{height}.png"
        if not os.path.exists(icon_path):
            print(f"❌ Ícone {icon_path} não encontrado!")
        else:
            print(f"✅ Ícone {width}x{height} encontrado")
    
    # Verificar splash screens
    splash_path = 'public/icons/ios/splash'
    if not os.path.exists(splash_path):
        print(f"❌ Diretório {splash_path} não encontrado!")
        return False
    
    # Tamanhos esperados para splash screens
    splash_files = [
        "splash-750x1334.png",
        "splash-828x1792.png",
        "splash-1125x2436.png",
        "splash-1170x2532.png",
        "splash-1284x2778.png",
        "splash-1536x2048.png",
        "splash-1668x2388.png",
        "splash-2048x2732.png"
    ]
    
    for filename in splash_files:
        file_path = f"{splash_path}/{filename}"
        if not os.path.exists(file_path):
            print(f"❌ Splash screen {file_path} não encontrada!")
        else:
            print(f"✅ Splash screen {filename} encontrada")
    
    # Verificar se o manifest.json contém todas as referências
    with open('public/manifest.json', 'r') as f:
        manifest = json.load(f)
    
    # Verificar se os ícones estão declarados no manifest
    icon_srcs = [icon['src'] for icon in manifest.get('icons', [])]
    missing_icons = []
    
    if '/apple-touch-icon.png' not in icon_srcs:
        missing_icons.append('/apple-touch-icon.png')
    
    for width, height in ios_sizes:
        icon_src = f"/icons/ios/apple-touch-icon-{width}x{height}.png"
        if icon_src not in icon_srcs:
            missing_icons.append(icon_src)
    
    if missing_icons:
        print("❌ Os seguintes ícones estão faltando no manifest.json:")
        for icon in missing_icons:
            print(f"  - {icon}")
    else:
        print("✅ Todos os ícones iOS estão referenciados no manifest.json")
    
    # Verificar layout.tsx
    layout_path = 'app/layout.tsx'
    if not os.path.exists(layout_path):
        print(f"❌ Arquivo {layout_path} não encontrado!")
        return False
    
    with open(layout_path, 'r') as f:
        layout_content = f.read()
    
    # Verificar referências no layout.tsx
    apple_touch_refs = 0
    for width, height in ios_sizes:
        if f"apple-touch-icon-{width}x{height}.png" in layout_content:
            apple_touch_refs += 1
    
    if apple_touch_refs < len(ios_sizes):
        print(f"⚠️ Possíveis referências de ícones faltando no layout.tsx. Encontradas: {apple_touch_refs}/{len(ios_sizes)}")
    else:
        print("✅ Todas as referências de ícones iOS encontradas no layout.tsx")
    
    # Verificar referências de splash screens
    splash_refs = 0
    for filename in splash_files:
        if filename in layout_content:
            splash_refs += 1
    
    if splash_refs < len(splash_files):
        print(f"⚠️ Possíveis referências de splash screens faltando no layout.tsx. Encontradas: {splash_refs}/{len(splash_files)}")
    else:
        print("✅ Todas as referências de splash screens encontradas no layout.tsx")
    
    print("\nVerificação concluída!")
    return True

if __name__ == "__main__":
    verify_pwa_assets() 