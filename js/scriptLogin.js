document.addEventListener("DOMContentLoaded", () => {

  const btn = document.getElementById("btnLogin");
  const iUser = document.getElementById("iUser");
  const iPass = document.getElementById("iPass");
  const eye = document.getElementById("eye");
  const chkRecordar = document.querySelector(".chk input[type='checkbox']");

  const msgErr = document.getElementById("msgErr");
  const errTxt = document.getElementById("errTxt");
  const msgOk = document.getElementById("msgOk");


  function error(txt) {
    errTxt.textContent = txt;
    msgErr.style.display = "flex";
  }

  function limpiar() {
    msgErr.style.display = "none";
  }

  iUser.addEventListener("input", limpiar);
  iPass.addEventListener("input", limpiar);

  eye.addEventListener("click", () => {
    const show = iPass.type === "password";
    iPass.type = show ? "text" : "password";
    eye.textContent = show ? "🙈" : "👁️";
  });

  function doLogin() {
    const u = iUser.value.trim();
    const p = iPass.value;

    if (!u) return error("Ingresa usuario");
    if (!p) return error("Ingresa contraseña");

    btn.disabled = true;
    limpiar();

    fetch("php/login.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "usuario=" + encodeURIComponent(u) + "&password=" + encodeURIComponent(p)
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {

          sessionStorage.setItem("logueado", "true");
          sessionStorage.setItem("usuario_id", data.id);
          sessionStorage.setItem("nombreUsuario", data.usuario || u);

          if (data.foto_perfil) {
            sessionStorage.setItem("foto_perfil", data.foto_perfil);
          }

          msgOk.style.display = "flex";
          setTimeout(() => {
            window.location.replace("index.html");
          }, 1000);
        } else {
          error(data.message || "Usuario o contraseña incorrectos");
        }
        btn.disabled = false;
      })
      .catch(err => {
        console.error(err);
        error("Error de conexión con el servidor");
        btn.disabled = false;
      });
  }

  btn.addEventListener("click", doLogin);

  document.addEventListener("keypress", (e) => {
    if (e.key === "Enter") doLogin();
  });

  const aForgot = document.getElementById("aForgot");
  const aSolicitar = document.getElementById("aSolicitar");

  if (aForgot) {
    aForgot.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "forgot-password.html";
    });
  }

  if (aSolicitar) {
    aSolicitar.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "registro.html";
    });
  }
});
