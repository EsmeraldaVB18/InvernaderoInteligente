<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Content-Type: application/json");
include "conexion.php";

$usuario_id = $_GET["usuario_id"] ?? "";

if (!$usuario_id) {
    echo json_encode(["success" => false, "message" => "Falta usuario_id"]);
    exit;
}

$stmt = $conn->prepare("SELECT id, nombre, apellido, correo, usuario, foto_perfil FROM usuarios WHERE id = ?");
$stmt->bind_param("i", $usuario_id);
$stmt->execute();
$res = $stmt->get_result();

if ($res->num_rows > 0) {
    $row = $res->fetch_assoc();
    echo json_encode(["success" => true, "data" => $row]);
} else {
    echo json_encode(["success" => false, "message" => "Usuario no encontrado"]);
}
?>
