package pe.edu.upeu.orden.repository;

import pe.edu.upeu.orden.entity.Orden;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface OrdenRepository extends JpaRepository<Orden, Long> {

    @Query("SELECT DISTINCT o FROM Orden o LEFT JOIN FETCH o.detalles")
    List<Orden> findAllConDetalles();

    @Query("SELECT o FROM Orden o LEFT JOIN FETCH o.detalles WHERE o.id = :id")
    Optional<Orden> findByIdConDetalles(@Param("id") Long id);

    @Query("SELECT DISTINCT o FROM Orden o LEFT JOIN FETCH o.detalles WHERE o.idCliente = :idCliente ORDER BY o.fechaCreacion DESC")
    List<Orden> findByIdClienteConDetalles(@Param("idCliente") String idCliente);

    List<Orden> findByEstadoAndFechaCreacionBefore(String estado, LocalDateTime limite);
}
