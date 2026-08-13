<?php
include "php/conexion.php";

echo "--- USUARIOS ---\n";
$res = $conn->query("DESCRIBE usuarios");
if($res) {
    while($row = $res->fetch_assoc()) {
        echo json_encode($row) . "\n";
    }
}

echo "--- HISTORIAL_ANALISIS ---\n";
$res = $conn->query("DESCRIBE historial_analisis");
if($res) {
    while($row = $res->fetch_assoc()) {
        echo json_encode($row) . "\n";
    }
}
?>
