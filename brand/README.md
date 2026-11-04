# Marca Finni Apoyo

Los recursos de la app se generan desde el kit de logo (PNG) con `genera_logos.py`
(requiere Pillow):

```bash
python3 brand/genera_logos.py <carpeta-del-kit> <carpeta-de-salida>
```

Espera en el kit `01-logo-para-fondo-claro.png` (logo transparente) y
`05-icono.png` (símbolo transparente). Genera:

| Archivo | Dónde va | Uso |
|---|---|---|
| `logo-claro.png`, `logo-oscuro.png`, `emblema.png` | `src/assets/brand/` | `BrandMark` (oscuro = letras blancas, para fondos oscuros y tema oscuro) |
| `favicon.ico`, `favicon.png` | `public/` | pestaña del navegador |
| `apple-touch-icon.png` | `public/` | ícono al agregar a inicio en iPhone |
| `pwa-192.png`, `pwa-512.png`, `pwa-maskable-512.png` | `public/` | ícono de la app instalada (Android) |
| `og-image.png` | `public/` | vista previa al compartir el enlace |

La versión oscura no sale del kit (su 02 trae el fondo marino pegado): se
deriva del logo transparente poniendo las letras en blanco y aclarando el
símbolo. Los PNG del kit traen color oculto en píxeles 100% transparentes; el
script lo limpia y redimensiona con alfa premultiplicado para que no aparezcan
halos en los bordes.
