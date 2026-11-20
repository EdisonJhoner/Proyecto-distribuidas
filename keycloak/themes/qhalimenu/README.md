# Tema de acceso QhaliMenu (Keycloak)

Tema personalizado de **login** para el realm `qhalimenu`. Extiende el tema
oficial `keycloak.v2` (PatternFly 5) y aplica el sistema visual del frontend
Angular: paleta verde, tipografías Fraunces/Manrope, marca QhaliMenu y textos en
español.

## Estructura

```
keycloak/themes/qhalimenu/
└── login/
    ├── theme.properties          # parent, estilos y enlaces configurables
    ├── template.ftl              # estructura base de todas las pantallas
    ├── login.ftl                 # pantalla de usuario/contraseña
    ├── messages/
    │   └── messages_es.properties
    └── resources/
        ├── css/
        │   ├── styles.css        # copia del tema oficial keycloak.v2
        │   └── qhalimenu.css     # diseño QhaliMenu (todo el look & feel)
        └── img/
            ├── auth-hero.jpg     # fotografía del panel de marca
            └── logo.svg          # favicon
```

## Cómo se activa

`keycloak/compose-dev.yml` monta la carpeta en el contenedor:

```yaml
volumes:
  - ./themes/qhalimenu:/opt/keycloak/themes/qhalimenu:ro
```

Y el realm debe apuntar al tema:

```json
"loginTheme": "qhalimenu",
"internationalizationEnabled": true,
"supportedLocales": ["es"],
"defaultLocale": "es"
```

El archivo `keycloak/import/qhalimenu-realm.json` ya lo incluye, así que una
instalación desde cero lo aplica automáticamente. En un realm ya existente se
actualiza por la Admin REST API:

```powershell
$body = @{ grant_type='password'; client_id='admin-cli'; username='admin'; password='admin123' }
$tok  = Invoke-RestMethod -Uri 'http://localhost:18180/realms/master/protocol/openid-connect/token' `
        -Method Post -Body $body -ContentType 'application/x-www-form-urlencoded'
$h    = @{ Authorization = 'Bearer ' + $tok.access_token }
$json = @{ loginTheme='qhalimenu'; internationalizationEnabled=$true;
           supportedLocales=@('es'); defaultLocale='es' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:18180/admin/realms/qhalimenu' `
  -Method Put -Headers $h -Body $json -ContentType 'application/json'
```

## Edición en desarrollo

El compose arranca Keycloak con la caché de temas desactivada
(`KC_SPI_THEME_CACHE_THEMES=false`, `KC_SPI_THEME_CACHE_TEMPLATES=false`), por lo
que los cambios en CSS o FTL se ven al recargar la página de login.

Si el navegador conserva estilos antiguos, recarga forzada (`Ctrl+F5`). Para
cambiar la URL del enlace **Volver a QhaliMenu**, edita `qmFrontendUrl` en
`login/theme.properties` y recarga.

## Decisiones de diseño

- **Dos columnas** en escritorio: panel de marca (foto + propuesta de valor) y
  tarjeta de acceso. En pantallas menores de 900 px se convierte en una barra
  superior con la marca, el enlace de retorno y la tarjeta a ancho completo.
- **Orientación**: título claro, subtítulo que explica qué cuenta usar, labels
  visibles, enlace de retorno al sitio y pie de ayuda con el correo de soporte.
- **Mensajes en español** (realm con locale `es`) y errores de validación
  traducidos.
- **Recuperación de contraseña deshabilitada**: el entorno DEV no tiene SMTP, así
  que el enlace habría llevado a un callejón sin salida.
- Los estilos propios viven en `qhalimenu.css`; `styles.css` se conserva como
  copia del tema oficial para que `parent=keycloak.v2` resuelva igual.
