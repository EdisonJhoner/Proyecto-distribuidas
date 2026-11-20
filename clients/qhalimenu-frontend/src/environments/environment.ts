/**
 * Entorno de desarrollo (ng serve).
 * Todo el tráfico de negocio entra por el API Gateway de QhaliMenu.
 */
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:18080/api/v1',
  keycloak: {
    url: 'http://localhost:18180',
    realm: 'qhalimenu',
    clientId: 'qhalimenu-frontend'
  },
  qrApiUrl: 'https://api.qrserver.com/v1/create-qr-code/'
};
