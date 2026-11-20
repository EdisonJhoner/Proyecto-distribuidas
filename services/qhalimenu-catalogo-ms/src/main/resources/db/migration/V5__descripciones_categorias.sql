-- Alinea las descripciones de las categorías existentes con el menú saludable.
UPDATE categorias
SET descripcion = 'Platos de fondo saludables con proteína, granos y vegetales'
WHERE nombre = 'Almuerzos';

UPDATE categorias
SET descripcion = 'Bebidas naturales, infusiones y batidos sin azúcar añadida'
WHERE nombre = 'Bebidas';
