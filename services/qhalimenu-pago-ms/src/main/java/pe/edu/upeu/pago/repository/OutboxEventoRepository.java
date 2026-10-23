package pe.edu.upeu.pago.repository;

import pe.edu.upeu.pago.entity.OutboxEvento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OutboxEventoRepository extends JpaRepository<OutboxEvento, Long> {

    List<OutboxEvento> findTop50ByEstadoOrderByCreadoEnAsc(String estado);
}
