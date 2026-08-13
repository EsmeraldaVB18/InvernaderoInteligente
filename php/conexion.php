<?php

$conn = new mysqli(
    "localhost",
    "root",
    "",
    "invernadero"
);

if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}
?>