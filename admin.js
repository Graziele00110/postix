const supabase = window.supabase.createClient(
  "https://SEU_PROJETO.supabase.co",
  "SUA_PUBLIC_KEY"
);

// gerar token aleatório
function gerarToken() {
  return Math.random().toString(36).substring(2, 10);
}

async function criarToken() {
  const token = gerarToken();
  const expira = document.getElementById("expira").value;
  const usos = parseInt(document.getElementById("usos").value) || 1;

  await supabase.from("tokens").insert([
    {
      token: token,
      expira: expira,
      usado: false,
      usos_max: usos,
      usos_atual: 0
    }
  ]);

  alert("Token criado!");
  listarTokens();
}

async function listarTokens() {
  const { data } = await supabase.from("tokens").select("*");

  const lista = document.getElementById("lista");
  lista.innerHTML = "";

  data.forEach(t => {
    lista.innerHTML += `
      <div class="token-card">
        <p><b>Token:</b> ${t.token}</p>
        <p>Expira: ${t.expira}</p>
        <p>Usos: ${t.usos_atual}/${t.usos_max}</p>

        <button onclick="copiarLink('${t.token}')">Copiar Link</button>
        <button onclick="deletar('${t.id}')">Deletar</button>
      </div>
    `;
  });
}

function copiarLink(token) {
  const link = `${window.location.origin}/?token=${token}`;
  navigator.clipboard.writeText(link);
  alert("Link copiado!");
}

async function deletar(id) {
  await supabase.from("tokens").delete().eq("id", id);
  listarTokens();
}

listarTokens();
