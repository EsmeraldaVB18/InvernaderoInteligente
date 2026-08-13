<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Content-Type: application/json");
include "conexion.php";

$id = $_POST["id"] ?? "";
$usuario_id = $_POST["usuario_id"] ?? "";

if (!$id || !$usuario_id) {
    echo json_encode(["success" => false, "message" => "Faltan datos obligatorios"]);
    exit;
}

$stmt = $conn->prepare("DELETE FROM historial_analisis WHERE id = ? AND usuario_id = ?");
$stmt->bind_param("ii", $id, $usuario_id);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Registro eliminado"]);
} else {
    echo json_encode(["success" => false, "message" => "Error al eliminar: " . $stmt->error]);
}
?>
