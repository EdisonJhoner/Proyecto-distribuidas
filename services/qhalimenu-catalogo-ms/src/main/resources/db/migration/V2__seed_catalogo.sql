INSERT INTO categorias (nombre, descripcion) VALUES
    ('Almuerzos', 'Platos de fondo del comedor universitario'),
    ('Bebidas', 'Bebidas incluidas o adicionales al menu');

INSERT INTO productos (nombre, descripcion, precio, activo, id_categoria) VALUES
    ('Lomo saltado', 'Lomo saltado con papas y arroz', 15.00, true, 1),
    ('Ceviche', 'Ceviche de pescado fresco', 18.00, true, 1),
    ('Arroz con pollo', 'Arroz con pollo y ensalada', 12.00, true, 1),
    ('Chicha morada', 'Vaso de chicha morada', 3.50, true, 2);
