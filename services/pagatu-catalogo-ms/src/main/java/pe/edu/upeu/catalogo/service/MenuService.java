package pe.edu.upeu.catalogo.service;

import pe.edu.upeu.catalogo.dto.MenuRequest;
import pe.edu.upeu.catalogo.dto.MenuResponse;

import java.util.List;

public interface MenuService {

    List<MenuResponse> findAll();

    MenuResponse create(MenuRequest request);
}
