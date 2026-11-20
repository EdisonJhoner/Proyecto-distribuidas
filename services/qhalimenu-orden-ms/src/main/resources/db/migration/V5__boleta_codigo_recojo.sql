ALTER TABLE ordenes ADD COLUMN IF NOT EXISTS codigo_recojo VARCHAR(20);
ALTER TABLE ordenes ADD COLUMN IF NOT EXISTS nombre_cliente VARCHAR(120);
ALTER TABLE ordenes ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMP;
ALTER TABLE ordenes ADD COLUMN IF NOT EXISTS fecha_entrega TIMESTAMP;

ALTER TABLE orden_detalles ADD COLUMN IF NOT EXISTS nombre_producto VARCHAR(150);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ordenes_codigo_recojo ON ordenes (codigo_recojo);
