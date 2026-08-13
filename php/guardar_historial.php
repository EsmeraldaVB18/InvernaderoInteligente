<?php

include "conexion.php";

$usuario = $_POST["usuario"];
$diagnostico = $_POST["diagnostico"];
$confianza = $_POST["confianza"];
$descripcion = $_POST["descripcion"];
$recomendacion = $_POST["recomendacion"];

$stmt = $conn->prepare("
INSERT INTO historial_analisis
(usuario,diagnostico,confianza,descripcion,recomendacion)
VALUES (?,?,?,?,?)
");

$stmt->bind_param(
"ssiss",
$usuario,
$diagnostico,
$confianza,
$descripcion,
$recomendacion
);

echo json_encode([
    "success"=>$stmt->execute()
]);