const API_URL = "https://postix-api.onrender.com";

let imagemOriginal = null;
let partes = [];

let DPI = 150;

// aumenta qualidade só se imagem não for gigante
function ajustarDPI(larguraCm, alturaCm) {
  const area = larguraCm * alturaCm;

  if (area < 2000) {
    DPI = 300; // alta qualidade
  } else if (area < 5000) {
    DPI = 200; // médio
  } else {
    DPI = 150; // leve (evita travar)
  }
}

const formatos = {
  A5: { w: 148, h: 210 },
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
  A2: { w: 420, h: 594 },
  A1: { w: 594, h: 841 }
};

const mmToPx = mm => (mm / 25.4) * DPI;

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

  } catch (error) {
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

/* PREVIEW */
function gerarPreview() {
  if (!imagemOriginal) {
    alert("Envie uma imagem!");
    return;
  }

  const larguraCm = parseFloat(larguraCmInput.value);
  const alturaCm = parseFloat(alturaCmInput.value);
  const formato = formatoSelect.value;
  const orientacao = orientacaoSelect.value;

  if (!larguraCm || !alturaCm) {
    alert("Preencha largura e altura do poster!");
    return;
  }

  ajustarDPI(larguraCm, alturaCm);

  const larguraPosterMm = larguraCm * 10;
  const alturaPosterMm = alturaCm * 10;

  let folha = formatos[formato];
  let folhaW = folha.w;
  let folhaH = folha.h;

  if (orientacao === "landscape") {
    [folhaW, folhaH] = [folhaH, folhaW];
  }

  const cols = Math.ceil(larguraPosterMm / folhaW);
  const rows = Math.ceil(alturaPosterMm / folhaH);

  const preview = document.getElementById("preview");
  preview.innerHTML = "";
  partes = [];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {

      partes.push({
        x,
        y,
        folhaW,
        folhaH,
        larguraPosterMm,
        alturaPosterMm
      });

      const canvas = document.createElement("canvas");
      canvas.width = 210;
      canvas.height = 297;

      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#111";
      ctx.font = "20px Arial";
      ctx.fillText(`Pág. ${partes.length}`, 60, 145);

      preview.appendChild(canvas);
    }
  }

  document.getElementById("status").innerText =
    `Quantidade real: ${partes.length} folha(s).`;
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

  const margemMm = parseFloat(margemMmInput.value) || 0;
  const bleedMm = parseFloat(bleedMmInput.value) || 0;

  for (let i = 0; i < partes.length; i++) {
    const p = partes[i];

    const progresso = Math.round((i / partes.length) * 100);
    barra.style.width = progresso + "%";
    status.innerText = `Gerando PDF... ${progresso}%`;

    await new Promise(r => setTimeout(r, 5));

    if (i > 0) {
      pdf.addPage([p.folhaW, p.folhaH]);
    }

    const folhaWpx = mmToPx(p.folhaW);
    const folhaHpx = mmToPx(p.folhaH);

    const canvas = document.createElement("canvas");
    canvas.width = folhaWpx;
    canvas.height = folhaHpx;

    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, folhaWpx, folhaHpx);

    const margemPx = mmToPx(margemMm);
    const bleedPx = mmToPx(bleedMm);

    const areaX = margemPx + bleedPx;
    const areaY = margemPx + bleedPx;
    const areaW = folhaWpx - areaX * 2;
    const areaH = folhaHpx - areaY * 2;

    const inicioXmm = p.x * p.folhaW;
    const inicioYmm = p.y * p.folhaH;

    const corteWmm = Math.min(p.folhaW, p.larguraPosterMm - inicioXmm);
    const corteHmm = Math.min(p.folhaH, p.alturaPosterMm - inicioYmm);

    const sx = (inicioXmm / p.larguraPosterMm) * imagemOriginal.width;
    const sy = (inicioYmm / p.alturaPosterMm) * imagemOriginal.height;

    const sw = (corteWmm / p.larguraPosterMm) * imagemOriginal.width;
    const sh = (corteHmm / p.alturaPosterMm) * imagemOriginal.height;

    const drawW = areaW * (corteWmm / p.folhaW);
    const drawH = areaH * (corteHmm / p.folhaH);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      imagemOriginal,
      sx,
      sy,
      sw,
      sh,
      areaX,
      areaY,
      drawW,
      drawH
    );

    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.strokeRect(areaX, areaY, areaW, areaH);

    const imgData = canvas.toDataURL("image/jpeg", 0.9);

    pdf.addImage(
      imgData,
      "JPEG",
      0,
      0,
      p.folhaW,
      p.folhaH
    );
  }

  barra.style.width = "100%";
  status.innerText = "Finalizando...";

  pdf.save("postix.pdf");

  status.innerText = `PDF concluído com ${partes.length} folha(s).`;
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

/* 👁️ VISUALIZAR SENHA */
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

/* LIMPAR TUDO */
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

/* calcular folhas */
function calcularFolhasReais(larguraCm, alturaCm, folhaW, folhaH) {
  const larguraMm = larguraCm * 10;
  const alturaMm = alturaCm * 10;

  const cols = Math.ceil(larguraMm / folhaW);
  const rows = Math.ceil(alturaMm / folhaH);

  return {
    cols,
    rows,
    total: cols * rows
  };
}
