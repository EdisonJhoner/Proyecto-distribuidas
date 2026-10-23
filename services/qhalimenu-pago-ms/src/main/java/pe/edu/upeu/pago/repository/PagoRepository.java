package pe.edu.upeu.pago.repository;

import pe.edu.upeu.pago.entity.Pago;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PagoRepository extends JpaRepository<Pago, Long> {

    List<Pago> findByOrdenId(Long ordenId);

    Optional<Pago> findFirstByOrdenId(Long ordenId);

    Optional<Pago> findByPreferenceId(String preferenceId);
}
