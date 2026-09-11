INSERT INTO ordenes (id_cliente, estado, tipo_comprobante, metodo_pago, momento_pago, total)
VALUES (1, 'PENDIENTE', 'BOLETA_SIMPLE', 'YAPE_PLIN', 'ADELANTADO', 15.00);

INSERT INTO orden_detalles (id_orden, id_producto, cantidad, precio_unitario)
VALUES (1, 1, 1, 15.00);
