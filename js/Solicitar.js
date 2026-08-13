document.getElementById("btnEnviar").addEventListener("click", () => {

  const nombre = document.getElementById("fNombre").value.trim();
  const apellido = document.getElementById("fApellido").value.trim();
  const correo = document.getElementById("fEmail").value.trim();
  const usuario = document.getElementById("fUsuario").value.trim();
  const pass = document.getElementById("fPass").value;
  const pass2 = document.getElementById("fPass2").value;

  if (pass !== pass2) {
    alert("Las contraseñas no coinciden");
    return;
  }

  fetch("php/registro.php", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:
      "nombre=" + encodeURIComponent(nombre) +
      "&apellido=" + encodeURIComponent(apellido) +
      "&correo=" + encodeURIComponent(correo) +
      "&usuario=" + encodeURIComponent(usuario) +
      "&password=" + encodeURIComponent(pass)
  })
    .then(res => res.json())
    .then(data => {

      if (data.success) {
        alert("Cuenta creada correctamente");
        document.getElementById("formSection").style.display = "none";
        document.getElementById("successSection").style.display = "block";
      } else {
        alert(data.message);
      }

    })
    .catch(err => {
      console.error(err);
      alert("Error de conexión con PHP");
    });

});
