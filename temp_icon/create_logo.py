from PIL import Image, ImageDraw
import os

# Criar os diretórios de ícones se não existirem
os.makedirs('public/icons/new', exist_ok=True)

# Função para criar o ícone com fundo transparente
def create_logo(size, output_path):
    # Criar uma imagem com fundo transparente
    icon = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(icon)
    
    # Definir cores
    blue_color = (59, 130, 246)  # Azul em formato RGB
    
    # Calcular proporções
    padding = int(size * 0.08)
    phone_width = size - (padding * 2)
    phone_height = int(phone_width * 1.8)
    
    # Ajustar altura para garantir que a imagem caiba no canvas
    if phone_height > size:
        phone_height = size - (padding * 2)
    
    # Desenhar o contorno do celular (arredondado)
    phone_left = padding
    phone_top = int((size - phone_height) / 2)
    
    # Desenhar o celular com bordas arredondadas
    corner_radius = int(size * 0.1)
    draw.rounded_rectangle(
        [(phone_left, phone_top), (phone_left + phone_width, phone_top + phone_height)],
        radius=corner_radius,
        fill=blue_color
    )
    
    # Desenhar o interior do celular (área de tela) - em preto
    screen_padding = int(size * 0.04)
    screen_left = phone_left + screen_padding
    screen_top = phone_top + screen_padding
    screen_width = phone_width - (screen_padding * 2)
    screen_height = phone_height - (screen_padding * 2) - int(size * 0.05)
    
    draw.rounded_rectangle(
        [(screen_left, screen_top), (screen_left + screen_width, screen_top + screen_height)],
        radius=int(corner_radius * 0.8),
        fill=(0, 0, 0, 255)
    )
    
    # Desenhar o notch no topo do celular (garantindo que y1 > y0)
    notch_width = int(size * 0.15)
    notch_height = int(size * 0.03)
    notch_left = phone_left + (phone_width - notch_width) // 2
    
    # Se o notch for para cima, garanta que y0 < y1
    if notch_height > 0:
        draw.rectangle(
            [(notch_left, phone_top - notch_height), (notch_left + notch_width, phone_top)],
            fill=blue_color
        )
    
    # Desenhar o botão na parte inferior
    button_width = int(size * 0.15)
    button_height = int(size * 0.03)
    button_left = phone_left + (phone_width - button_width) // 2
    button_top = phone_top + phone_height
    draw.rectangle(
        [(button_left, button_top), (button_left + button_width, button_top + button_height)],
        fill=blue_color
    )
    
    # Desenhar o braço musculoso
    arm_center_x = screen_left + (screen_width // 2)
    arm_center_y = screen_top + (screen_height // 2)
    arm_size = int(screen_width * 0.75)
    
    # Desenhar o contorno do braço musculoso
    bicep_points = [
        (arm_center_x - int(arm_size * 0.3), arm_center_y - int(arm_size * 0.3)),  # Topo esquerdo
        (arm_center_x + int(arm_size * 0.25), arm_center_y - int(arm_size * 0.15)),  # Topo direito
        (arm_center_x + int(arm_size * 0.4), arm_center_y + int(arm_size * 0.25)),  # Direita
        (arm_center_x, arm_center_y + int(arm_size * 0.35)),  # Base
        (arm_center_x - int(arm_size * 0.4), arm_center_y + int(arm_size * 0.2)),  # Base esquerda
    ]
    draw.polygon(bicep_points, fill=blue_color)
    
    # Desenhar o haltere no meio do braço
    dumbbell_center_x = arm_center_x + int(arm_size * 0.05)
    dumbbell_center_y = arm_center_y + int(arm_size * 0.1)
    dumbbell_size = int(arm_size * 0.4)
    
    # Barra horizontal
    bar_width = int(dumbbell_size * 0.7)
    bar_height = int(dumbbell_size * 0.15)
    draw.rectangle(
        [(dumbbell_center_x - bar_width//2, dumbbell_center_y - bar_height//2),
         (dumbbell_center_x + bar_width//2, dumbbell_center_y + bar_height//2)],
        fill=(0, 0, 0, 255),
        outline=blue_color
    )
    
    # Pesos nas pontas
    weight_width = int(dumbbell_size * 0.2)
    weight_height = int(dumbbell_size * 0.3)
    
    # Peso esquerdo
    weight_left_x = dumbbell_center_x - bar_width//2 - weight_width
    draw.rounded_rectangle(
        [(weight_left_x, dumbbell_center_y - weight_height//2),
         (weight_left_x + weight_width, dumbbell_center_y + weight_height//2)],
        radius=int(weight_width * 0.3),
        fill=(0, 0, 0, 255),
        outline=blue_color
    )
    
    # Peso direito
    weight_right_x = dumbbell_center_x + bar_width//2
    draw.rounded_rectangle(
        [(weight_right_x, dumbbell_center_y - weight_height//2),
         (weight_right_x + weight_width, dumbbell_center_y + weight_height//2)],
        radius=int(weight_width * 0.3),
        fill=(0, 0, 0, 255),
        outline=blue_color
    )
    
    # Salvar a imagem
    icon.save(output_path, 'PNG')
    print(f"Ícone gerado: {output_path}")

# Criar ícones de diferentes tamanhos
create_logo(192, 'public/icons/new/icon-192x192.png')
create_logo(512, 'public/icons/new/icon-512x512.png') 