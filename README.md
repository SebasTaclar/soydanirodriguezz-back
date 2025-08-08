# soydanirodriguezz-back

Project for handling soydanirodriguezz-front
-- Solo una tabla de compras con número de wallpaper
CREATE TABLE purchases (
id SERIAL PRIMARY KEY,

-- Identificador del wallpaper (simple)
wallpaper_number INTEGER NOT NULL, -- Ej: 1, 2, 3, 4...

-- Datos mínimos del comprador
buyer_email VARCHAR(255) NOT NULL,
buyer_name VARCHAR(255),

-- Mercado Pago básico
mercadopago_payment_id VARCHAR(255) UNIQUE,
preference_id VARCHAR(255),
status VARCHAR(50), -- pending, approved
amount DECIMAL(10,2),

created_at TIMESTAMP DEFAULT NOW()
);
