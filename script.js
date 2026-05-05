const API_URL = "http://localhost:3000";

let imagemOriginal = null;
let partes = [];

const DPI = 150;

const formatos = {
  A5: { w: 148, h: 210 },
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
  A2: { w: 420, h: 594 },
  A1: { w: 594, h: 841 }
};

const mmToPx = mm => (mm / 25.4) * DPI;

/* ELEMENTOS */
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
const popupOverlay = document.getElementById("popupOverlay");

/* TEMA */
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

/* LOGIN */
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

  loginMensagem.innerText = "Verificando acesso...";

  try {
    const resposta = await fetch(`${API_URL}/login`, {
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

    const dados = await resposta.json();

    if (!resposta.ok) {
      loginMensagem.innerText = dados.error || "Erro ao fazer login.";
      return;
    }

    localStorage.setItem("postix_logado", "true");
    localStorage.setItem("postix_email", email);
    localStorage.setItem("postix_token", dados.token);

    loginMensagem.innerText = "";
    liberarSistema();

  } catch {
    loginMensagem.innerText = "Erro ao conectar com o servidor.";
  }
}

function sair() {
  localStorage.removeItem("postix_logado");
  localStorage.removeItem("postix_email");
  localStorage.removeItem("postix_token");
  bloquearSistema();
}

window.addEventListener("load", () => {
  if (localStorage.getItem("postix_logado") === "true") {
    liberarSistema();
  } else {
    bloquearSistema();
  }
});

/* 👁️ VISUALIZAR SENHA (SVG) */
function alternarSenha() {
  const input = document.getElementById("senhaLogin");
  const eye = document.getElementById("iconEye");
  const eyeOff = document.getElementById("iconEyeOff");

  if (input.type === "password") {
    input.type = "text";
    eye.style.display = "none";
    eyeOff.style.display = "block";
  } else {
    input.type = "password";
    eye.style.display = "block";
    eyeOff.style.display = "none";
  }
}

/* UPLOAD */
upload.addEventListener("change", e => {
  const file = e.target.files[0];

  if (!file) return;

  const img = new Image();

  img.onload = () => {
    imagemOriginal = img;
    document.getElementById("status").innerText = "Imagem carregada com sucesso.";
  };

  img.src = URL.createObjectURL(file);
});

/* PREVIEW (DIVISÃO CORRETA) */
function gerarPreview() {
  if (!imagemOriginal) {
    alert("Envie uma imagem!");
    return;
  }

  const larguraCm = parseFloat(larguraCmInput.value);
  const alturaCm = parseFloat(alturaCmInput.value);
  const formato = formatoSelect.value;
  const orientacao = orientacaoSelect.value;
  const margemMm = parseFloat(margemMmInput.value) || 0;
  const bleedMm = parseFloat(bleedMmInput.value) || 0;

  if (!larguraCm || !alturaCm) {
    alert("Preencha largura e altura do poster!");
    return;
  }

  let folha = formatos[formato];
  let folhaW = folha.w;
  let folhaH = folha.h;

  if (orientacao === "landscape") {
    [folhaW, folhaH] = [folhaH, folhaW];
  }

  const larguraPosterPx = mmToPx(larguraCm * 10);
  const alturaPosterPx = mmToPx(alturaCm * 10);

  const folhaWpx = mmToPx(folhaW);
  const folhaHpx = mmToPx(folhaH);

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = larguraPosterPx;
  tempCanvas.height = alturaPosterPx;

  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(imagemOriginal, 0, 0, larguraPosterPx, alturaPosterPx);

  const preview = document.getElementById("preview");
  preview.innerHTML = "";
  partes = [];

  const cols = Math.ceil(larguraPosterPx / folhaWpx);
  const rows = Math.ceil(alturaPosterPx / folhaHpx);

  const margemPx = mmToPx(margemMm);
  const bleedPx = mmToPx(bleedMm);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {

      const canvas = document.createElement("canvas");
      canvas.width = folhaWpx;
      canvas.height = folhaHpx;

      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, folhaWpx, folhaHpx);

      const areaX = margemPx + bleedPx;
      const areaY = margemPx + bleedPx;
      const areaW = folhaWpx - areaX * 2;
      const areaH = folhaHpx - areaY * 2;

      ctx.drawImage(
        tempCanvas,
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
      ctx.lineWidth = 2;
      ctx.strokeRect(areaX, areaY, areaW, areaH);

      partes.push({
        canvas,
        folhaW,
        folhaH
      });

      preview.appendChild(canvas);
    }
  }

  document.getElementById("status").innerText =
    `Preview gerado: ${partes.length} página(s).`;
}

/* PDF */
async function gerarPDF() {
  if (partes.length === 0) {
    alert("Gere o preview primeiro!");
    return;
  }

  const { jsPDF } = window.jspdf;

  const primeira = partes[0];

  const pdf = new jsPDF({
    unit: "mm",
    format: [primeira.folhaW, primeira.folhaH]
  });

  const barra = document.getElementById("barra");
  const status = document.getElementById("status");

  for (let i = 0; i < partes.length; i++) {
    const progresso = Math.round((i / partes.length) * 100);

    barra.style.width = progresso + "%";
    status.innerText = `Gerando PDF... ${progresso}%`;

    await new Promise(resolve => setTimeout(resolve, 5));

    if (i > 0) {
      pdf.addPage([partes[i].folhaW, partes[i].folhaH]);
    }

    const imgData = partes[i].canvas.toDataURL("image/jpeg", 0.8);

    pdf.addImage(
      imgData,
      "JPEG",
      0,
      0,
      partes[i].folhaW,
      partes[i].folhaH
    );
  }

  barra.style.width = "100%";
  status.innerText = "Finalizando...";

  pdf.save("postix.pdf");

  status.innerText = "Download concluído!";
}

/* LIMPAR */
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

  document.getElementById("preview").innerHTML = "";
  document.getElementById("barra").style.width = "0%";
  document.getElementById("status").innerText = "Campos limpos.";
}

/* POPUP */
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
