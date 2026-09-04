package pe.edu.upeu.catalogo.service;

import pe.edu.upeu.catalogo.dto.MenuRequest;
import pe.edu.upeu.catalogo.dto.MenuResponse;
import pe.edu.upeu.catalogo.entity.Menu;
import pe.edu.upeu.catalogo.repository.MenuRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class MenuServiceImpl implements MenuService {

    private final MenuRepository menuRepository;

    public MenuServiceImpl(MenuRepository menuRepository) {
        this.menuRepository = menuRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<MenuResponse> findAll() {
        return menuRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public MenuResponse create(MenuRequest request) {
        Menu menu = Menu.builder()
                .nombre(request.nombre())
                .precio(request.precio())
                .raciones(request.raciones())
                .build();
        return toResponse(menuRepository.save(menu));
    }

    private MenuResponse toResponse(Menu menu) {
        return new MenuResponse(
                menu.getId(),
                menu.getNombre(),
                menu.getPrecio(),
                menu.getRaciones()
        );
    }
}
