package pe.edu.upeu.orden.repository;

import pe.edu.upeu.orden.entity.Orden;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OrdenRepository extends JpaRepository<Orden, Long> {

    @Query("SELECT DISTINCT o FROM Orden o LEFT JOIN FETCH o.detalles")
    List<Orden> findAllConDetalles();

    @Query("SELECT o FROM Orden o LEFT JOIN FETCH o.detalles WHERE o.id = :id")
    Optional<Orden> findByIdConDetalles(@Param("id") Long id);
}
