const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const crypto = require("crypto");

const app = express();
const db = new sqlite3.Database("./db.sqlite");

app.use(cors());
app.use(express.json());

const ADMIN_KEY = "postix-admin-2026";

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      devices TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

function verificarAdmin(req, res, next) {
  const key = req.headers["x-admin-key"];

  if (key !== ADMIN_KEY) {
    return res.status(403).json({ error: "Acesso admin negado." });
  }

  next();
}

app.post("/login", (req, res) => {
  const { email, password, deviceId } = req.body;

  if (!email || !password || !deviceId) {
    return res.status(400).json({ error: "Dados incompletos." });
  }

  db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
    if (err) return res.status(500).json({ error: "Erro no servidor." });

    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Email ou senha inválidos." });
    }

    let devices = JSON.parse(user.devices || "[]");

    if (!devices.includes(deviceId)) {
      if (devices.length >= 2) {
        return res.status(403).json({
          error: "Limite de 2 dispositivos atingido."
        });
      }

      devices.push(deviceId);
    }

    db.run(
      "UPDATE users SET devices = ? WHERE id = ?",
      [JSON.stringify(devices), user.id],
      () => {
        const token = crypto.randomBytes(32).toString("hex");
        res.json({ success: true, token });
      }
    );
  });
});

app.post("/admin/criar", verificarAdmin, (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email e senha são obrigatórios." });
  }

  db.run(
    "INSERT INTO users (email, password, devices) VALUES (?, ?, ?)",
    [email, password, "[]"],
    err => {
      if (err) return res.status(400).json({ error: "Usuário já existe." });
      res.json({ success: true, message: "Usuário criado com sucesso." });
    }
  );
});

app.get("/admin/usuarios", verificarAdmin, (req, res) => {
  db.all("SELECT id, email, devices, created_at FROM users ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Erro ao listar usuários." });

    const usuarios = rows.map(user => ({
      id: user.id,
      email: user.email,
      dispositivos: JSON.parse(user.devices || "[]").length,
      criadoEm: user.created_at
    }));

    res.json(usuarios);
  });
});

app.delete("/admin/usuarios/:id", verificarAdmin, (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM users WHERE id = ?", [id], err => {
    if (err) return res.status(500).json({ error: "Erro ao excluir usuário." });
    res.json({ success: true, message: "Usuário excluído." });
  });
});

app.post("/admin/resetar-dispositivos/:id", verificarAdmin, (req, res) => {
  const { id } = req.params;

  db.run("UPDATE users SET devices = ? WHERE id = ?", ["[]", id], err => {
    if (err) return res.status(500).json({ error: "Erro ao resetar dispositivos." });
    res.json({ success: true, message: "Dispositivos resetados." });
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});