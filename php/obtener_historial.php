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

$stmt = $conn->prepare("SELECT * FROM historial_analisis WHERE usuario_id = ? ORDER BY fecha DESC");
$stmt->bind_param("i", $usuario_id);
$stmt->execute();
$res = $stmt->get_result();

$historial = [];
while ($row = $res->fetch_assoc()) {
    $historial[] = [
        "id" => (int)$row["id"],
        "fecha" => $row["fecha"],
        "diagnostico" => $row["diagnostico"],
        "confianza" => (int)$row["confianza"],
        "descripcion" => $row["descripcion"],
        "recomendacion" => $row["recomendacion"],
        "imgSrc" => $row["imagen"],
        "tipo" => (strtolower(trim($row["diagnostico"])) == "sana" || strtolower(trim($row["diagnostico"])) == "planta sana" || strtolower(trim($row["diagnostico"])) == "saludable") ? "sana" : "plaga"
    ];
}

echo json_encode(["success" => true, "data" => $historial]);
?>
