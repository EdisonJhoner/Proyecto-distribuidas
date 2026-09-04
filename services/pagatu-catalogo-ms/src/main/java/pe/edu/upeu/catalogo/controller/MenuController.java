package pe.edu.upeu.catalogo.controller;

import jakarta.validation.Valid;
import pe.edu.upeu.catalogo.dto.MenuRequest;
import pe.edu.upeu.catalogo.dto.MenuResponse;
import pe.edu.upeu.catalogo.service.MenuService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/menus")
public class MenuController {

    private final MenuService menuService;

    public MenuController(MenuService menuService) {
        this.menuService = menuService;
    }

    @GetMapping
    public ResponseEntity<List<MenuResponse>> list() {
        return ResponseEntity.ok(menuService.findAll());
    }

    @PostMapping
    public ResponseEntity<MenuResponse> create(@Valid @RequestBody MenuRequest request) {
        MenuResponse created = menuService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
