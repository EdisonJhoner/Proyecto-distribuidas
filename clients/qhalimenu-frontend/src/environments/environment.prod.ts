/**
 * Entorno de producción.
 * Se sirve detrás del API Gateway / reverse proxy del mismo origen, por eso
 * las rutas son relativas. Ajusta `keycloak.url` al host público real.
 */
export const environment = {
  production: true,
  apiBaseUrl: '/api/v1',
  keycloak: {
    url: 'http://localhost:18180',
    realm: 'qhalimenu',
    clientId: 'qhalimenu-frontend'
  },
  qrApiUrl: 'https://api.qrserver.com/v1/create-qr-code/'
};
