<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Content-Type: application/json");
include "conexion.php";

$correo = trim($_POST["correo"] ?? "");

if (!$correo || !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(["success" => false, "message" => "Ingresa un correo válido."]);
    exit;
}

// Verificar que el correo existe
$stmt = $conn->prepare("SELECT id FROM usuarios WHERE correo = ?");
$stmt->bind_param("s", $correo);
$stmt->execute();
$res = $stmt->get_result();

if ($res->num_rows === 0) {
    // Para facilitar tus pruebas, ahora te avisará si el correo no existe
    echo json_encode(["success" => false, "message" => "Este correo no está registrado en el sistema."]);
    exit;
}

// Asegurar que la tabla password_resets existe
$conn->query("CREATE TABLE IF NOT EXISTS password_resets (
    id    INT AUTO_INCREMENT PRIMARY KEY,
    correo VARCHAR(150),
    token  VARCHAR(255),
    fecha  DATETIME
)");

// Eliminar tokens anteriores del mismo correo
$del = $conn->prepare("DELETE FROM password_resets WHERE correo = ?");
$del->bind_param("s", $correo);
$del->execute();

// Generar token seguro
$token = bin2hex(random_bytes(32));
$fecha = date("Y-m-d H:i:s");

$ins = $conn->prepare("INSERT INTO password_resets (correo, token, fecha) VALUES (?, ?, ?)");
$ins->bind_param("sss", $correo, $token, $fecha);
$ins->execute();

// En entorno XAMPP local no hay servidor SMTP configurado.
// Devolvemos el enlace directamente para pruebas.
$enlace = "http://localhost/InvernaderoInteligente/nueva-contrasena.html?token=" . $token;

echo json_encode([
    "success" => true,
    "message" => "Token generado correctamente.",
    "enlace"  => $enlace,   // Solo para entorno local/desarrollo
    "token"   => $token     // Solo para entorno local/desarrollo
]);
?>
