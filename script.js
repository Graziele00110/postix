const API_URL = "https://postix-api.onrender.com";

let imagemOriginal = null;
let partes = [];

const upload = document.getElementById("upload");
const preview = document.getElementById("preview");
const barra = document.getElementById("barra");
const status = document.getElementById("status");

/* 👁️ mostrar senha */
function alternarSenha() {
  const senha = document.getElementById("senhaLogin");
  const btn = document.querySelector(".ver-senha");

  if (senha.type === "password") {
    senha.type = "text";
    btn.innerText = "🙈";
  } else {
    senha.type = "password";
    btn.innerText = "👁️";
  }
}

/* login */
async function fazerLogin() {
  const email = emailLogin.value;
  const senha = senhaLogin.value;

  const res = await fetch(API_URL + "/login", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      email,
      password: senha,
      deviceId: localStorage.deviceId || (localStorage.deviceId = crypto.randomUUID())
    })
  });

  const data = await res.json();

  if (!res.ok) {
    loginMensagem.innerText = data.error;
    return;
  }

  localStorage.logado = true;
  loginArea.style.display = "none";
  app.style.display = "block";
}

/* sair */
function sair() {
  localStorage.clear();
  location.reload();
}

/* upload */
upload.onchange = e => {
  const img = new Image();
  img.onload = () => imagemOriginal = img;
  img.src = URL.createObjectURL(e.target.files[0]);
};

/* preview */
function gerarPreview() {
  preview.innerHTML = "";
  partes = [];

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = 400;
  canvas.height = 400;

  ctx.drawImage(imagemOriginal, 0, 0, 400, 400);

  preview.appendChild(canvas);
  partes.push(canvas);
}

/* PDF */
function gerarPDF() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  partes.forEach((c, i) => {
    if (i > 0) pdf.addPage();
    pdf.addImage(c.toDataURL(), "JPEG", 0, 0, 210, 297);
  });

  pdf.save("postix.pdf");
}

/* limpar */
function limparTudo() {
  if (!confirm("Limpar tudo?")) return;

  upload.value = "";
  preview.innerHTML = "";
  partes = [];
  status.innerText = "";
  barra.style.width = "0%";
}

/* popup */
function abrirPopup() {
  popupOverlay.style.display = "flex";
}

function fecharPopup() {
  popupOverlay.style.display = "none";
}
