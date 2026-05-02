let imagemOriginal = null;
let partes = [];

const DPI = 150;

function cmParaMm(cm) {
  return cm * 10;
}

function mmParaPx(mm) {
  return (mm / 25.4) * DPI;
}

document.getElementById("upload").addEventListener("change", function(e) {
  const file = e.target.files[0];
  const img = new Image();

  img.onload = function() {
    imagemOriginal = img;
  };

  img.src = URL.createObjectURL(file);
});

function gerarPreview() {
  if (!imagemOriginal) return alert("Envie uma imagem!");

  const larguraCm = parseFloat(document.getElementById("larguraCm").value);
  const alturaCm = parseFloat(document.getElementById("alturaCm").value);
  const margemMm = parseFloat(document.getElementById("margemMm").value) || 5;

  if (!larguraCm || !alturaCm) {
    alert("Preencha largura e altura!");
    return;
  }

  const larguraMm = cmParaMm(larguraCm);
  const alturaMm = cmParaMm(alturaCm);

  const larguraPxFinal = mmParaPx(larguraMm);
  const alturaPxFinal = mmParaPx(alturaMm);

  // Redimensiona imagem
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = larguraPxFinal;
  tempCanvas.height = alturaPxFinal;

  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(imagemOriginal, 0, 0, larguraPxFinal, alturaPxFinal);

  const preview = document.getElementById("preview");
  preview.innerHTML = "";
  partes = [];

  const folhaW = mmParaPx(210);
  const folhaH = mmParaPx(297);

  const cols = Math.ceil(larguraPxFinal / folhaW);
  const rows = Math.ceil(alturaPxFinal / folhaH);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {

      const canvas = document.createElement("canvas");
      canvas.width = folhaW;
      canvas.height = folhaH;

      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, folhaW, folhaH);

      const margemPx = mmParaPx(margemMm);

      const areaW = folhaW - margemPx * 2;
      const areaH = folhaH - margemPx * 2;

      ctx.drawImage(
        tempCanvas,
        x * folhaW,
        y * folhaH,
        folhaW,
        folhaH,
        margemPx,
        margemPx,
        areaW,
        areaH
      );

      ctx.strokeStyle = "black";
      ctx.strokeRect(
        margemPx,
        margemPx,
        areaW,
        areaH
      );

      partes.push(canvas);
      preview.appendChild(canvas);
    }
  }
}

async function gerarPDF() {
  if (partes.length === 0) return alert("Gere o preview primeiro!");

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: "mm" });

  const barra = document.getElementById("barra");
  const status = document.getElementById("status");

  for (let i = 0; i < partes.length; i++) {

    const progresso = Math.round((i / partes.length) * 100);
    barra.style.width = progresso + "%";
    status.innerText = `Gerando PDF... ${progresso}%`;

    await new Promise(r => setTimeout(r, 5));

    if (i > 0) pdf.addPage([210, 297]);

    const imgData = partes[i].toDataURL("image/jpeg", 0.7);

    pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
  }

  barra.style.width = "100%";
  status.innerText = "Finalizando...";

  pdf.save("postix.pdf");

  status.innerText = "Download concluído!";
}