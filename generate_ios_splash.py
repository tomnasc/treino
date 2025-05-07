#!/usr/bin/env python3
from PIL import Image
import os

def create_ios_splash_screens():
    # Garantir que o diretório de destino existe
    os.makedirs('public/icons/ios/splash', exist_ok=True)
    
    # Definir tamanhos de tela para dispositivos iOS comuns
    splash_screens = [
        # iPhone SE, 8, 7, 6s, 6
        {"width": 750, "height": 1334, "name": "splash-750x1334.png"},
        # iPhone XR, 11
        {"width": 828, "height": 1792, "name": "splash-828x1792.png"},
        # iPhone X, XS, 11 Pro, 12 mini, 13 mini
        {"width": 1125, "height": 2436, "name": "splash-1125x2436.png"},
        # iPhone 12, 12 Pro, 13, 13 Pro, 14
        {"width": 1170, "height": 2532, "name": "splash-1170x2532.png"},
        # iPhone 12 Pro Max, 13 Pro Max, 14 Plus, 14 Pro Max
        {"width": 1284, "height": 2778, "name": "splash-1284x2778.png"},
        # iPad (9.7")
        {"width": 1536, "height": 2048, "name": "splash-1536x2048.png"},
        # iPad Pro (11")
        {"width": 1668, "height": 2388, "name": "splash-1668x2388.png"},
        # iPad Pro (12.9")
        {"width": 2048, "height": 2732, "name": "splash-2048x2732.png"}
    ]
    
    try:
        # Usar o ícone como base para criar as telas de inicialização
        source_icon = Image.open('public/icons/icon-512x512.png')
        
        # Converter para RGB se tiver transparência
        if source_icon.mode == 'RGBA':
            # Criar um fundo branco
            background = Image.new('RGBA', source_icon.size, (255, 255, 255, 255))
            # Compor a imagem sobre o fundo branco
            source_icon = Image.alpha_composite(background, source_icon)
            # Converter para RGB
            source_icon = source_icon.convert('RGB')
        
        # Tamanho do ícone na tela de inicialização (50% da menor dimensão)
        icon_size_percentage = 0.5
        
        for screen in splash_screens:
            width = screen["width"]
            height = screen["height"]
            filename = screen["name"]
            
            # Criar uma nova imagem com fundo branco
            splash = Image.new('RGB', (width, height), (255, 255, 255))
            
            # Calcular o tamanho do ícone (50% da menor dimensão)
            icon_size = int(min(width, height) * icon_size_percentage)
            
            # Redimensionar o ícone
            icon = source_icon.resize((icon_size, icon_size), Image.LANCZOS)
            
            # Calcular a posição para centralizar o ícone
            x = (width - icon_size) // 2
            y = (height - icon_size) // 2
            
            # Colar o ícone na imagem de fundo
            splash.paste(icon, (x, y))
            
            # Salvar a tela de inicialização
            splash_path = f"public/icons/ios/splash/{filename}"
            splash.save(splash_path, "PNG")
            print(f"Gerado: {splash_path}")
    
    except Exception as e:
        print(f"Erro ao gerar telas de inicialização: {e}")

if __name__ == "__main__":
    create_ios_splash_screens() 