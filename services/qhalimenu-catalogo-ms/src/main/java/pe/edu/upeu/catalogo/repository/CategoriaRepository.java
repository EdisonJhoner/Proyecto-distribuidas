package pe.edu.upeu.catalogo.repository;

import pe.edu.upeu.catalogo.entity.Categoria;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoriaRepository extends JpaRepository<Categoria, Long> {
}
