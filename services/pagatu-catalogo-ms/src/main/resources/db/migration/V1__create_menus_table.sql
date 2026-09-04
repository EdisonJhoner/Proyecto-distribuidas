DROP TABLE IF EXISTS menus;

CREATE TABLE menus (
    id       BIGSERIAL PRIMARY KEY,
    nombre   VARCHAR(100) NOT NULL,
    precio   NUMERIC(10, 2) NOT NULL,
    raciones INTEGER NOT NULL
);
