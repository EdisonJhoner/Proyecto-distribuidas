import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { ConfirmService } from './services/confirm.service';
import { ToastService } from './services/toast.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the router outlet and global hosts', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
    expect(compiled.querySelector('app-toast-host')).not.toBeNull();
    expect(compiled.querySelector('app-confirm-host')).not.toBeNull();
  });

  it('should render notifications emitted by ToastService', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const toast = TestBed.inject(ToastService);
    toast.success('Reserva registrada', 'Orden #12');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Reserva registrada');
    expect(compiled.textContent).toContain('Orden #12');
  });

  it('should render the confirmation dialog requested by ConfirmService', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const confirm = TestBed.inject(ConfirmService);
    void confirm.confirmar({
      titulo: '¿Cancelar la orden?',
      mensaje: 'El stock volverá al catálogo.',
      confirmar: 'Sí, cancelar'
    });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('¿Cancelar la orden?');
    expect(compiled.textContent).toContain('Sí, cancelar');
  });
});
