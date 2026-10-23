package pe.edu.upeu.orden.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "outbox_eventos")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OutboxEvento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "evento_id", nullable = false, unique = true, length = 36)
    private String eventoId;

    @Column(name = "agregado_tipo", nullable = false, length = 30)
    private String agregadoTipo;

    @Column(name = "agregado_id", nullable = false, length = 50)
    private String agregadoId;

    @Column(name = "tipo", nullable = false, length = 50)
    private String tipo;

    @Column(name = "topic", nullable = false, length = 100)
    private String topic;

    @Column(name = "payload", nullable = false, columnDefinition = "TEXT")
    private String payload;

    @Column(name = "estado", nullable = false, length = 20)
    private String estado;

    @Builder.Default
    @Column(name = "intentos", nullable = false)
    private int intentos = 0;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn;

    @Column(name = "publicado_en")
    private LocalDateTime publicadoEn;
}
