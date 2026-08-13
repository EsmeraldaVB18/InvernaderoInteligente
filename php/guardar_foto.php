<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Content-Type: application/json");
include "conexion.php";

$usuario_id = $_POST["usuario_id"] ?? "";
$foto       = $_POST["foto"]       ?? "";

if (!$usuario_id || !$foto) {
    echo json_encode(["success" => false, "message" => "Faltan datos"]);
    exit;
}

// Verificar que la columna existe; si no, crearla
$check = $conn->query("SHOW COLUMNS FROM usuarios LIKE 'foto_perfil'");
if ($check->num_rows === 0) {
    $conn->query("ALTER TABLE usuarios ADD COLUMN foto_perfil LONGTEXT NULL DEFAULT NULL");
}

$stmt = $conn->prepare("UPDATE usuarios SET foto_perfil = ? WHERE id = ?");
$stmt->bind_param("si", $foto, $usuario_id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Foto actualizada"]);
} else {
    echo json_encode(["success" => false, "message" => "Error: " . $stmt->error]);
}
?>
