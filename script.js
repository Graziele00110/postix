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
  if (!imagemOriginal) {
    alert("Envie uma imagem!");
    return;
  }

  const larguraCm = parseFloat(document.getElementById("larguraCm").value);
  const alturaCm = parseFloat(document.getElementById("alturaCm").value);

  if (!larguraCm || !alturaCm) {
    alert("Preencha largura e altura!");
    return;
  }

  const formato = document.getElementById("formato").value;
  const orientacao = document.getElementById("orientacao").value;

  const margemMm = parseFloat(document.getElementById("margemMm").value) || 0;
  const bleedMm = parseFloat(document.getElementById("bleedMm").value) || 0;

  const formatos = {
    A5: { w: 148, h: 210 },
    A4: { w: 210, h: 297 },
    A3: { w: 297, h: 420 },
    A2: { w: 420, h: 594 },
    A1: { w: 594, h: 841 }
  };

  const DPI = 150;
  const mmToPx = mm => (mm / 25.4) * DPI;

  let folha = formatos[formato];
  let folhaW = folha.w;
  let folhaH = folha.h;

  if (orientacao === "landscape") {
    [folhaW, folhaH] = [folhaH, folhaW];
  }

  const folhaWpx = mmToPx(folhaW);
  const folhaHpx = mmToPx(folhaH);

  const larguraPx = mmToPx(larguraCm * 10);
  const alturaPx = mmToPx(alturaCm * 10);

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = larguraPx;
  tempCanvas.height = alturaPx;

  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(imagemOriginal, 0, 0, larguraPx, alturaPx);

  const preview = document.getElementById("preview");
  preview.innerHTML = "";
  partes = [];

  const cols = Math.ceil(larguraPx / folhaWpx);
  const rows = Math.ceil(alturaPx / folhaHpx);

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
      ctx.strokeRect(areaX, areaY, areaW, areaH);

      partes.push({ canvas, folhaW, folhaH });
      preview.appendChild(canvas);
    }
  }

  document.getElementById("status").innerText =
    `${partes.length} páginas geradas.`;
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
