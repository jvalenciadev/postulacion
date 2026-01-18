CREATE DATABASE IF NOT EXISTS postulacion_esfm;

/* Create user if not exists */
CREATE USER IF NOT EXISTS 'postulacion_esfm'@'localhost';

/* Set password to empty string explicitly */
SET PASSWORD FOR 'postulacion_esfm'@'localhost' = PASSWORD('');

/* Grant all privileges */
GRANT ALL PRIVILEGES ON postulacion_esfm.* TO 'postulacion_esfm'@'localhost';

FLUSH PRIVILEGES;

/* Optional: Insert sample data for testing */
USE postulacion_esfm;
CREATE TABLE IF NOT EXISTS postulacion_esfm (
    ci VARCHAR(20) PRIMARY KEY,
    departamento VARCHAR(100),
    esfm VARCHAR(100),
    municipio VARCHAR(100),
    recinto VARCHAR(100),
    direccion VARCHAR(200),
    fecha VARCHAR(50),
    aula VARCHAR(50),
    turno VARCHAR(50),
    equipo VARCHAR(50)
);

INSERT IGNORE INTO postulacion_esfm (ci, departamento, esfm, municipio, recinto, direccion, fecha, aula, turno, equipo)
VALUES ('14122404', 'LA PAZ', 'EDUCACION FISICA Y DEPORTES', 'LA PAZ', 'COLEGIO MILITAR DEL EJERCITO', 'AV. IRPAVI ZONA SUR', '20-01-2024', 'A-101', 'MAÑANA', 'EQ-05');
