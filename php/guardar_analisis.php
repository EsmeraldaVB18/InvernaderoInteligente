<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Content-Type: application/json");
include "conexion.php";

$usuario_id = $_POST["usuario_id"] ?? "";
$diagnostico = $_POST["diagnostico"] ?? "";
$confianza = $_POST["confianza"] ?? "";
$descripcion = $_POST["descripcion"] ?? "";
$recomendacion = $_POST["recomendacion"] ?? "";
$imagen = $_POST["imagen"] ?? ""; // Base64 de la imagen

if (!$usuario_id || !$diagnostico) {
    echo json_encode(["success" => false, "message" => "Faltan datos obligatorios"]);
    exit;
}

// Convertir confianza a número entero
$confianza_int = (int) str_replace('%', '', $confianza);

$stmt = $conn->prepare("INSERT INTO historial_analisis (usuario_id, diagnostico, confianza, descripcion, recomendacion, imagen) VALUES (?, ?, ?, ?, ?, ?)");
$stmt->bind_param("isssss", $usuario_id, $diagnostico, $confianza_int, $descripcion, $recomendacion, $imagen);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Análisis guardado exitosamente", "id" => $conn->insert_id]);
} else {
    echo json_encode(["success" => false, "message" => "Error al guardar: " . $stmt->error]);
}
?>
