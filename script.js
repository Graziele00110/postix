// =========================
// CONFIG
// =========================
const API_URL = "https://postix-api.onrender.com"; // troque depois pelo Render

let imagemOriginal = null;
let partes = [];

const DPI = 150;

// =========================
// FORMATOS (mm)
// =========================
const formatos = {
  A5: { w: 148, h: 210 },
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
  A2: { w: 420, h: 594 },
  A1: { w: 594, h: 841 }
};

// =========================
// ELEMENTOS
// =========================
const btnTema = document.getElementById("toggleTema");
const loginArea = document.getElementById("loginArea");
const appArea = document.getElementById("app");
const loginMensagem = document.getElementById("loginMensagem");

const upload = document.getElementById("upload");
const larguraCmInput = document.getElementById("larguraCm");
const alturaCmInput = document.getElementById("alturaCm");
const formatoSelect = document.getElementById("formato");
const orientacaoSelect = document.getElementById("orientacao");
const margemMmInput = document.getElementById("margemMm");
const bleedMmInput = document.getElementById("bleedMm");

const preview = document.getElementById("preview");
const barra = document.getElementById("barra");
const status = document.getElementById("status");
const popupOverlay = document.getElementById("popupOverlay");

// =========================
// TEMA
// =========================
if (localStorage.getItem("tema") === "light") {
  document.body.classList.add("light");
  btnTema.innerText = "☀️";
}

btnTema.onclick = () => {
  document.body.classList.toggle("light");

  if (document.body.classList.contains("light")) {
    btnTema.innerText = "☀️";
    localStorage.setItem("tema", "light");
  } else {
    btnTema.innerText = "🌙";
    localStorage.setItem("tema", "dark");
  }
};

// =========================
// LOGIN
// =========================
function gerarDeviceId() {
  let deviceId = localStorage.getItem("postix_device_id");

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("postix_device_id", deviceId);
  }

  return deviceId;
}

function liberarSistema() {
  loginArea.style.display = "none";
  appArea.style.display = "block";
}

function bloquearSistema() {
  loginArea.style.display = "block";
  appArea.style.display = "none";
}

async function fazerLogin() {
  const email = document.getElementById("emailLogin").value.trim();
  const senha = document.getElementById("senhaLogin").value.trim();

  if (!email || !senha) {
    loginMensagem.innerText = "Preencha email e senha.";
    return;
  }

  loginMensagem.innerText = "Verificando...";

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password: senha,
        deviceId: gerarDeviceId()
      })
    });

    const data = await res.json();

    if (!res.ok) {
      loginMensagem.innerText = data.error;
      return;
    }

    localStorage.setItem("postix_logado", "true");
    liberarSistema();

  } catch {
    loginMensagem.innerText = "Erro ao conectar servidor.";
  }
}

function sair() {
  localStorage.clear();
  bloquearSistema();
}

window.onload = () => {
  if (localStorage.getItem("postix_logado") === "true") {
    liberarSistema();
  } else {
    bloquearSistema();
  }
};

// =========================
// CONVERSÃO
// =========================
const mmToPx = mm => (mm / 25.4) * DPI;

// =========================
// UPLOAD
// =========================
upload.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const img = new Image();

  img.onload = () => {
    imagemOriginal = img;
    status.innerText = "Imagem carregada!";
  };

  img.src = URL.createObjectURL(file);
});

// =========================
// PREVIEW
// =========================
function gerarPreview() {
  if (!imagemOriginal) {
    alert("Envie uma imagem!");
    return;
  }

  const larguraCm = parseFloat(larguraCmInput.value);
  const alturaCm = parseFloat(alturaCmInput.value);

  if (!larguraCm || !alturaCm) {
    alert("Preencha dimensões!");
    return;
  }

  const formato = formatoSelect.value;
  const orientacao = orientacaoSelect.value;

  const margem = parseFloat(margemMmInput.value) || 0;
  const bleed = parseFloat(bleedMmInput.value) || 0;

  let folha = formatos[formato];
  let w = folha.w;
  let h = folha.h;

  if (orientacao === "landscape") {
    [w, h] = [h, w];
  }

  const folhaWpx = mmToPx(w);
  const folhaHpx = mmToPx(h);

  const larguraPx = mmToPx(larguraCm * 10);
  const alturaPx = mmToPx(alturaCm * 10);

  const temp = document.createElement("canvas");
  temp.width = larguraPx;
  temp.height = alturaPx;

  temp.getContext("2d").drawImage(imagemOriginal, 0, 0, larguraPx, alturaPx);

  preview.innerHTML = "";
  partes = [];

  const cols = Math.ceil(larguraPx / folhaWpx);
  const rows = Math.ceil(alturaPx / folhaHpx);

  const margemPx = mmToPx(margem);
  const bleedPx = mmToPx(bleed);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {

      const canvas = document.createElement("canvas");
      canvas.width = folhaWpx;
      canvas.height = folhaHpx;

      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const areaX = margemPx + bleedPx;
      const areaY = margemPx + bleedPx;

      const areaW = folhaWpx - areaX * 2;
      const areaH = folhaHpx - areaY * 2;

      ctx.drawImage(
        temp,
        x * folhaWpx,
        y * folhaHpx,
        folhaWpx,
        folhaHpx,
        areaX,
        areaY,
        areaW,
        areaH
      );

      ctx.strokeStyle = "black";
      ctx.strokeRect(areaX, areaY, areaW, areaH);

      partes.push({ canvas, w, h });
      preview.appendChild(canvas);
    }
  }

  status.innerText = `${partes.length} páginas geradas.`;
}

// =========================
// PDF
// =========================
async function gerarPDF() {
  if (!partes.length) {
    alert("Gere preview!");
    return;
  }

  const { jsPDF } = window.jspdf;

  const pdf = new jsPDF({
    unit: "mm",
    format: [partes[0].w, partes[0].h]
  });

  for (let i = 0; i < partes.length; i++) {

    const progresso = Math.round((i / partes.length) * 100);
    barra.style.width = progresso + "%";
    status.innerText = `Gerando PDF ${progresso}%`;

    await new Promise(r => setTimeout(r, 5));

    if (i > 0) pdf.addPage();

    const img = partes[i].canvas.toDataURL("image/jpeg", 0.8);

    pdf.addImage(img, "JPEG", 0, 0, partes[i].w, partes[i].h);
  }

  barra.style.width = "100%";
  status.innerText = "Finalizando...";

  pdf.save("postix.pdf");

  status.innerText = "Download concluído!";
}

// =========================
// LIMPAR (NOVO)
// =========================
function limparTudo() {

  if (!confirm("Deseja limpar tudo?")) return;

  upload.value = "";
  larguraCmInput.value = "";
  alturaCmInput.value = "";
  margemMmInput.value = "5";
  bleedMmInput.value = "3";

  formatoSelect.value = "A4";
  orientacaoSelect.value = "portrait";

  imagemOriginal = null;
  partes = [];

  preview.innerHTML = "";

  barra.style.width = "0%";
  status.innerText = "Tudo limpo!";
}

// =========================
// POPUP
// =========================
function abrirPopup() {
  popupOverlay.style.display = "flex";
}

function fecharPopup() {
  popupOverlay.style.display = "none";
}

popupOverlay.addEventListener("click", e => {
  if (e.target === popupOverlay) {
    fecharPopup();
  }
});
