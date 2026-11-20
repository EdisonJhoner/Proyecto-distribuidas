-- ============================================================
-- Menú saludable QhaliMenu
-- Categorías nuevas + productos reales del catálogo.
-- Los precios y el stock son datos de demostración del comedor.
-- ============================================================

INSERT INTO categorias (nombre, descripcion)
SELECT 'Desayunos', 'Desayunos y bowls saludables para empezar el día'
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = 'Desayunos');

INSERT INTO categorias (nombre, descripcion)
SELECT 'Postres', 'Postres naturales sin azúcar añadida'
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = 'Postres');

-- El ceviche existente se alinea con la receta saludable del menú.
UPDATE productos
SET nombre = 'Ceviche clásico de pescado fresco',
    descripcion = 'Cubos de pescado blanco marinados en jugo de limón, cebolla morada, cilantro, choclo y camote.'
WHERE nombre = 'Ceviche';

INSERT INTO productos (nombre, descripcion, precio, activo, stock, id_categoria)
SELECT v.nombre, v.descripcion, v.precio, true, v.stock, c.id
FROM (VALUES
    -- Desayunos
    ('Tostadas integrales de palta y huevo', 'Pan de masa madre con aguacate machacado, huevo pochado y semillas de ajonjolí.', 8.50, 40, 'Desayunos'),
    ('Overnight oats de frutos rojos', 'Avena reposada en bebida vegetal con semillas de chía, arándanos y fresas.', 7.50, 40, 'Desayunos'),
    ('Tortilla de claras con espinaca', 'Omelette ligero con hojas frescas de espinaca, champiñones y tomate picado.', 9.00, 40, 'Desayunos'),
    ('Panqueques de avena y plátano', 'Tortitas sin harina refinada hechas con plátano maduro, huevo, avena y canela.', 7.90, 40, 'Desayunos'),
    ('Bowl de yogur griego y granola', 'Yogur natural sin azúcar con granola artesanal, nueces y trozos de manzana.', 8.90, 40, 'Desayunos'),
    ('Arepa de maíz con queso fresco', 'Arepa asada rellena de queso bajo en grasa y rodajas de tomate.', 6.50, 40, 'Desayunos'),
    ('Revuelto de tofu y cúrcuma', 'Alternativa vegana al huevo revuelto con pimientos, cebolla y un toque de cúrcuma.', 8.50, 40, 'Desayunos'),
    ('Pudín de chía con coco', 'Semillas de chía hidratadas en leche de coco ligera con ralladura de limón y kiwi.', 6.90, 40, 'Desayunos'),
    ('Batido bowl de acaí y frutos del bosque', 'Base cremosa de frutas congeladas decorada con semillas de calabaza y coco rallado.', 10.50, 35, 'Desayunos'),

    -- Almuerzos
    ('Sándwich integral de pavo y palta', 'Pan multicereal con pechuga de pavo natural, aguacate, lechuga y germinados.', 9.50, 40, 'Almuerzos'),
    ('Bowl andino de quinua y pollo', 'Quinua tricolor, pechuga a la plancha, palta, choclo, pepino y aderezo de limón.', 16.50, 40, 'Almuerzos'),
    ('Salmón al horno con camote', 'Filete de pescado con hierbas finas acompañado de camote asado y espárragos.', 24.00, 20, 'Almuerzos'),
    ('Guiso ligero de lentejas', 'Lentejas cocidas con zanahoria, apio, tomate y especias, servidas con arroz integral.', 11.50, 40, 'Almuerzos'),
    ('Pechuga de pollo al limón con brócoli', 'Pollo marinado en cítricos y ajo con ramilletes de brócoli al vapor y papa cocida.', 15.50, 40, 'Almuerzos'),
    ('Ensalada mediterránea de garbanzos', 'Garbanzos, pepino, aceitunas negras, tomate cherry, queso feta y aceite de oliva.', 12.50, 40, 'Almuerzos'),
    ('Pescado al vapor en papillote', 'Filete de pescado blanco cocido con julianas de zanahoria, calabacín y puerro.', 19.00, 25, 'Almuerzos'),
    ('Tallarines integrales al pesto de espinaca', 'Pasta integral con salsa de albahaca, espinaca, nueces y aceite de oliva.', 14.00, 40, 'Almuerzos'),
    ('Curry de garbanzos y leche de coco', 'Plato vegano especiado con cúrcuma, jengibre, tomate y espinacas frescas.', 13.50, 40, 'Almuerzos'),
    ('Wok de pollo y vegetales crujientes', 'Tiras de pollo salteadas con brócoli, pimiento, vainitas y salsa de soya baja en sodio.', 15.00, 40, 'Almuerzos'),
    ('Hamburguesa casera de frijoles negros', 'Medallón de frijoles y avena servido al plato con ensalada fresca y palta.', 13.90, 40, 'Almuerzos'),
    ('Arroz integral chaufa de verduras y huevo', 'Salteado saludable con arroz integral, pimientos, cebolla china, jengibre y tortilla de huevo.', 12.50, 40, 'Almuerzos'),
    ('Crema de zapallo y zanahoria', 'Sopa suave sin cremas pesadas decorada con semillas de girasol tostadas.', 9.50, 40, 'Almuerzos'),
    ('Wrap integral de hummus y vegetales', 'Tortilla integral rellena de pasta de garbanzos, zanahoria rallada, pepino y espinaca.', 10.90, 40, 'Almuerzos'),
    ('Ensalada César saludable con pollo', 'Lechuga romana, pollo a la plancha, aderezo ligero de yogur natural y lascas de parmesano.', 14.50, 40, 'Almuerzos'),
    ('Calabacines rellenos de atún', 'Zapallitos italianos horneados con relleno de atún al agua, tomate y hierbas.', 15.90, 30, 'Almuerzos'),
    ('Sopa minestrone de verduras', 'Caldo nutritivo con apio, zanahoria, tomate, albahaca y frijoles blancos.', 9.90, 40, 'Almuerzos'),
    ('Tacos de lechuga con carne magra', 'Hojas de lechuga crujiente rellenas de carne molida magra salteada con pico de gallo.', 14.90, 35, 'Almuerzos'),
    ('Berenjenas asadas a la napolitana', 'Rodajas de berenjena al horno con salsa de tomate natural, orégano y queso mozzarella ligero.', 13.50, 40, 'Almuerzos'),
    ('Ensalada tibia de espinaca y champiñones', 'Hojas verdes con champiñones salteados al ajo, nueces y vinagreta balsámica.', 12.90, 40, 'Almuerzos'),
    ('Tortilla española saludable', 'Versión al horno con papas cocidas, cebolla caramelizada en poco aceite y huevos.', 10.50, 40, 'Almuerzos'),
    ('Brochetas de pollo y pimientos', 'Pinchos a la plancha con trozos de pollo, cebolla morada, pimiento y calabacín.', 13.90, 40, 'Almuerzos'),

    -- Postres
    ('Mousse de cacao y palta', 'Crema de aguacate maduro con cacao puro en polvo, vainilla y pasta de dátiles.', 7.50, 30, 'Postres'),
    ('Helado natural de plátano (Nice Cream)', 'Plátano congelado procesado hasta quedar cremoso con un toque de canela.', 6.50, 30, 'Postres'),
    ('Manzanas horneadas con nueces', 'Mitades de manzana asadas con canela en polvo, nueces picadas y yogur griego.', 6.90, 30, 'Postres'),
    ('Trufas energéticas de avena y dátiles', 'Bolitas sin cocción hechas con dátiles, avena, cacao amargo y coco rallado.', 5.50, 35, 'Postres'),
    ('Gelatina natural de frutos rojos', 'Preparada con infusión de frutos del bosque, agar-agar y stevia.', 5.00, 35, 'Postres'),
    ('Brownie saludable de frijoles negros', 'Bizcocho húmedo sin harinas refinadas a base de frijoles, cacao puro, huevo y miel.', 7.00, 30, 'Postres'),
    ('Paletas heladas de yogur y mango', 'Mezcla congelada de yogur natural con puré de mango fresco sin azúcar añadida.', 5.50, 35, 'Postres'),
    ('Pudín de arroz integral con leche vegetal', 'Versión ligera del arroz con leche aromatizada con rama de canela y cáscara de naranja.', 6.50, 30, 'Postres'),
    ('Peras pochadas en infusión de jamaica', 'Peras cocidas en té de flores de jamaica con clavo de olor y canela.', 6.90, 30, 'Postres'),

    -- Bebidas
    ('Batido verde detox', 'Mezcla de espinaca fresca, piña, pepino, jugo de limón, jengibre y agua fría.', 8.00, 40, 'Bebidas'),
    ('Agua infusionada de pepino y menta', 'Agua fresca con rodajas finas de pepino, limón y hojas de hierbabuena.', 4.50, 50, 'Bebidas'),
    ('Té helado de jamaica y canela', 'Infusión fría de flores de jamaica con ramas de canela y rodajas de naranja.', 5.00, 40, 'Bebidas'),
    ('Leche dorada (Golden Milk)', 'Bebida vegetal tibia con cúrcuma, jengibre, canela y una pizca de pimienta negra.', 6.50, 35, 'Bebidas'),
    ('Limonada de fresa y albahaca', 'Jugo de limón fresco licuado con fresas naturales, hojas de albahaca y agua.', 6.00, 45, 'Bebidas'),
    ('Smoothie proteico de plátano y maní', 'Bebida cremosa de plátano, mantequilla de maní natural, leche y canela.', 8.50, 35, 'Bebidas'),
    ('Infusión digestiva de manzanilla y anís', 'Té caliente natural ideal para después de las comidas principales.', 3.50, 50, 'Bebidas'),
    ('Agua de chía y maracuyá', 'Jugo natural de maracuyá diluido en agua con semillas de chía hidratadas.', 5.50, 45, 'Bebidas'),
    ('Matcha latte frío', 'Té verde matcha batido con bebida de almendras o avena sin azúcar y hielo.', 9.00, 30, 'Bebidas')
) AS v(nombre, descripcion, precio, stock, cat)
JOIN categorias c ON c.nombre = v.cat
WHERE NOT EXISTS (SELECT 1 FROM productos p WHERE p.nombre = v.nombre);
