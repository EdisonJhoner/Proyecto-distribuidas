export interface Cliente {
  id: number;
  numeroDocumento: string;
  nombres: string;
  celular: string;
}

export interface ClienteRequest {
  numeroDocumento: string;
  nombres: string;
  celular: string;
}
