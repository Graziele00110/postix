async function criarToken() {
  const token = Math.random().toString(36).substring(2, 10);
  const expira = document.getElementById("expira").value;

  const { data, error } = await supabase
    .from("tokens")
    .insert([
      {
        token: token,
        expira: expira,
        usado: false
      }
    ]);

  if (error) {
    console.error("ERRO:", error);
    alert("Erro ao criar token");
    return;
  }

  alert("Token criado com sucesso!");
  listarTokens();
}
