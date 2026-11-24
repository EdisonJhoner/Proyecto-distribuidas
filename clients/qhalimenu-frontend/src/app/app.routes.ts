import { Routes } from '@angular/router';
import { PublicLayoutComponent } from './layouts/public-layout.component';
import { ClientLayoutComponent } from './layouts/client-layout.component';
import { AdminLayoutComponent } from './layouts/admin-layout.component';
import { adminGuard, authGuard, boletaGuard, cajaGuard, clienteGuard, invitadoGuard } from './guards/rol.guard';

export const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/landing/landing.component').then(m => m.LandingComponent),
        title: 'QhaliMenu · Almuerzos saludables listos para recoger'
      },
      {
        path: 'catalogo',
        loadComponent: () => import('./pages/catalogo/catalogo.component').then(m => m.CatalogoComponent),
        title: 'Menú de hoy · QhaliMenu'
      },
      {
        path: 'producto/:id',
        loadComponent: () => import('./pages/producto/producto-detalle.component').then(m => m.ProductoDetalleComponent),
        title: 'Detalle del plato · QhaliMenu'
      },
      {
        path: 'login',
        canActivate: [invitadoGuard],
        loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
        title: 'Iniciar sesión · QhaliMenu'
      }
    ]
  },
  {
    path: '',
    component: ClientLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'carrito',
        canActivate: [clienteGuard],
        loadComponent: () => import('./pages/carrito/carrito.component').then(m => m.CarritoComponent),
        title: 'Carrito y pago · QhaliMenu'
      },
      {
        path: 'pago-retorno',
        loadComponent: () => import('./pages/pago-retorno/pago-retorno.component')
          .then(m => m.PagoRetornoComponent),
        title: 'Confirmando pago · QhaliMenu'
      },
      {
        path: 'mis-ordenes',
        canActivate: [clienteGuard],
        loadComponent: () => import('./pages/mis-ordenes/mis-ordenes.component').then(m => m.MisOrdenesComponent),
        title: 'Mis reservas · QhaliMenu'
      },
      {
        path: 'perfil',
        canActivate: [clienteGuard],
        loadComponent: () => import('./pages/perfil/perfil.component').then(m => m.PerfilComponent),
        title: 'Mi perfil · QhaliMenu'
      },
      {
        path: 'boleta/:id',
        canActivate: [boletaGuard],
        loadComponent: () => import('./pages/boleta/boleta.component').then(m => m.BoletaComponent),
        title: 'Boleta digital · QhaliMenu'
      },
      {
        path: 'caja',
        canActivate: [cajaGuard],
        loadComponent: () => import('./pages/caja/caja.component').then(m => m.CajaComponent),
        title: 'Módulo de caja · QhaliMenu'
      }
    ]
  },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
        title: 'Resumen general · QhaliMenu'
      },
      {
        path: 'productos',
        loadComponent: () => import('./pages/admin/productos/admin-productos.component').then(m => m.AdminProductosComponent),
        title: 'Productos · QhaliMenu'
      },
      {
        path: 'categorias',
        loadComponent: () => import('./pages/admin/categorias/admin-categorias.component').then(m => m.AdminCategoriasComponent),
        title: 'Categorías · QhaliMenu'
      },
      {
        path: 'ordenes',
        loadComponent: () => import('./pages/admin/ordenes/admin-ordenes.component').then(m => m.AdminOrdenesComponent),
        title: 'Órdenes · QhaliMenu'
      },
      {
        path: 'pagos',
        loadComponent: () => import('./pages/admin/pagos/admin-pagos.component').then(m => m.AdminPagosComponent),
        title: 'Pagos · QhaliMenu'
      },
      {
        path: 'clientes',
        loadComponent: () => import('./pages/admin/clientes/admin-clientes.component').then(m => m.AdminClientesComponent),
        title: 'Clientes · QhaliMenu'
      }
    ]
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found.component').then(m => m.NotFoundComponent),
    title: 'Página no encontrada · QhaliMenu'
  }
];
