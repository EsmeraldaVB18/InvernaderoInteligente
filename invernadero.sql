USE invernadero;

SELECT * FROM usuarios;

USE invernadero;

DESCRIBE usuarios;
SELECT * FROM usuarios;

CREATE TABLE password_resets(
    id INT AUTO_INCREMENT PRIMARY KEY,
    correo VARCHAR(150),
    token VARCHAR(255),
    fecha DATETIME
);