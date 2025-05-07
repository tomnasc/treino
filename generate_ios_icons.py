#!/usr/bin/env python3
from PIL import Image
import os

def create_ios_icons():
    # Garantir que o diretório de destino existe
    os.makedirs('public/icons/ios', exist_ok=True)
    
    # Usar o ícone de 512x512 como base para criar os ícones para iOS
    source_icon = 'public/icons/icon-512x512.png'
    
    # Tamanhos específicos que o iOS precisa
    ios_sizes = [
        (57, 57),    # iPhone (Legacy)
        (60, 60),    # iPhone (Legacy)
        (72, 72),    # iPad (Legacy)
        (76, 76),    # iPad (Legacy)
        (114, 114),  # iPhone Retina (Legacy)
        (120, 120),  # iPhone Retina
        (144, 144),  # iPad Retina (Legacy)
        (152, 152),  # iPad
        (167, 167),  # iPad Pro
        (180, 180),  # iPhone Retina HD
    ]
    
    try:
        with Image.open(source_icon) as img:
            # Confirmar que a imagem é realmente um PNG
            if img.format != 'PNG':
                print(f"Aviso: O arquivo fonte {source_icon} não é um PNG genuíno. Convertendo-o primeiro.")
                img = img.convert('RGBA')
            
            # Criar ícones com os tamanhos corretos
            for width, height in ios_sizes:
                resized_img = img.resize((width, height), Image.LANCZOS)
                filename = f"public/icons/ios/apple-touch-icon-{width}x{height}.png"
                resized_img.save(filename, "PNG")
                print(f"Gerado: {filename}")
            
            # Criar o apple-touch-icon.png específico (180x180) na raiz
            resized_img = img.resize((180, 180), Image.LANCZOS)
            resized_img.save("public/apple-touch-icon.png", "PNG")
            print("Gerado: public/apple-touch-icon.png")
    
    except Exception as e:
        print(f"Erro ao processar a imagem: {e}")

if __name__ == "__main__":
    create_ios_icons() 