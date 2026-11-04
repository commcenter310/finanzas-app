import sys
from PIL import Image, ImageEnhance
kit, out = sys.argv[1], sys.argv[2]

def limpia(im):
    """Pone en negro-transparente los píxeles invisibles (alfa 0): su color
    oculto (ruido de la generación con IA) no debe filtrarse al redimensionar."""
    im = im.convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            if px[x, y][3] == 0:
                px[x, y] = (0, 0, 0, 0)
    return im

def redim(im, size):
    # Alfa premultiplicado: evita halos de color en los bordes al reducir
    return im.convert('RGBa').resize(size, Image.LANCZOS).convert('RGBA')

def recorta(im, margen=0):
    x0, y0, x1, y1 = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    return im.crop((max(0, x0 - margen), max(0, y0 - margen), min(im.width, x1 + margen), min(im.height, y1 + margen)))

def a_ancho(im, ancho):
    return redim(im, (ancho, round(im.height * ancho / im.width)))

def cuadrado(im, lado, fraccion, fondo=None):
    """Emblema centrado en un lienzo cuadrado ocupando `fraccion` del lado."""
    w, h = im.size
    escala = (lado * fraccion) / max(w, h)
    em = redim(im, (max(1, round(w * escala)), max(1, round(h * escala))))
    lienzo = Image.new('RGBA', (lado, lado), fondo or (0, 0, 0, 0))
    lienzo.alpha_composite(em, ((lado - em.width) // 2, (lado - em.height) // 2))
    return lienzo

logo = limpia(Image.open(f'{kit}/01-logo-para-fondo-claro.png'))
icono = limpia(Image.open(f'{kit}/05-icono.png'))

# Separar emblema y letras en el logo: primera franja de columnas vacía a la derecha del emblema
alfa = logo.getchannel('A')
cols = [any(alfa.getpixel((x, y)) > 8 for y in range(0, logo.height, 2)) for x in range(logo.width)]
inicio = cols.index(True)
x = inicio
while cols[x]: x += 1
corte = x  # fin del emblema
print('emblema termina en x =', corte, 'de', logo.width)

# ── Variante oscura: letras blancas, emblema un poco más brillante (como la 02) ──
oscuro = logo.copy()
emb = oscuro.crop((0, 0, corte, logo.height))
rgb = ImageEnhance.Brightness(emb.convert('RGB')).enhance(1.22)
rgb = ImageEnhance.Color(rgb).enhance(1.15)
emb_claro = rgb.convert('RGBA'); emb_claro.putalpha(emb.getchannel('A'))
oscuro.paste(emb_claro, (0, 0))
texto = oscuro.crop((corte, 0, logo.width, logo.height))
blanco = Image.new('RGBA', texto.size, (255, 255, 255, 255)); blanco.putalpha(texto.getchannel('A'))
oscuro.paste(blanco, (corte, 0))

# ── Recursos para la app ──
a_ancho(recorta(logo, 6), 600).save(f'{out}/logo-claro.png', optimize=True)
a_ancho(recorta(oscuro, 6), 600).save(f'{out}/logo-oscuro.png', optimize=True)
em = recorta(icono, 4)
cuadrado(em, 256, 0.96).save(f'{out}/emblema.png', optimize=True)

# ── Íconos (public/) ──
BLANCO = (255, 255, 255, 255)
cuadrado(em, 48, 0.92).save(f'{out}/favicon.png', optimize=True)
cuadrado(em, 64, 0.92).save(f'{out}/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
cuadrado(em, 180, 0.70, BLANCO).convert('RGB').save(f'{out}/apple-touch-icon.png', optimize=True)
cuadrado(em, 192, 0.72, BLANCO).convert('RGB').save(f'{out}/pwa-192.png', optimize=True)
cuadrado(em, 512, 0.72, BLANCO).convert('RGB').save(f'{out}/pwa-512.png', optimize=True)
# maskable: el sistema puede recortar hasta un círculo del 80% → emblema dentro del 56%
cuadrado(em, 512, 0.56, BLANCO).convert('RGB').save(f'{out}/pwa-maskable-512.png', optimize=True)

# ── Imagen para compartir el enlace (Open Graph 1200×630) ──
og = Image.new('RGBA', (1200, 630), (238, 243, 250, 255))   # --bg-app claro (#EEF3FA)
lg = a_ancho(recorta(logo, 0), 760)
og.alpha_composite(lg, ((1200 - lg.width) // 2, (630 - lg.height) // 2))
og.convert('RGB').save(f'{out}/og-image.png', optimize=True)
