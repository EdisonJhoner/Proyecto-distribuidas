package pe.edu.upeu.orden.repository;

import pe.edu.upeu.orden.entity.OutboxEvento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OutboxEventoRepository extends JpaRepository<OutboxEvento, Long> {

    List<OutboxEvento> findTop50ByEstadoOrderByCreadoEnAsc(String estado);
}
