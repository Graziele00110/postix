const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const crypto = require("crypto");

const app = express();
const dbPath = process.env.DB_PATH || "./db.sqlite";
const db = new sqlite3.Database(dbPath);

app.use(cors());
app.use(express.json());

const ADMIN_KEY = process.env.ADMIN_KEY || "postix-admin-2026";

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      devices TEXT DEFAULT '[]',
      plan_months INTEGER DEFAULT 3,
      expires_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`ALTER TABLE users ADD COLUMN plan_months INTEGER DEFAULT 3`, () => {});
  db.run(`ALTER TABLE users ADD COLUMN expires_at TEXT`, () => {});
});

function verificarAdmin(req, res, next) {
  const key = req.headers["x-admin-key"];

  if (key !== ADMIN_KEY) {
    return res.status(403).json({ error: "Acesso admin negado." });
  }

  next();
}

function calcularExpiracao(meses) {
  const data = new Date();
  data.setMonth(data.getMonth() + Number(meses));
  return data.toISOString();
}

function calcularExpiracaoDias(dias) {
  const data = new Date();
  data.setDate(data.getDate() + Number(dias));
  return data.toISOString();
}

function planoExpirado(expiresAt) {
  if (!expiresAt) return true;
  return new Date() > new Date(expiresAt);
}

// LOGIN DO CLIENTE
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

    if (planoExpirado(user.expires_at)) {
      return res.status(403).json({
        error: "Seu plano expirou. Renove para continuar usando o PostiX."
      });
    }

    let devices = [];

    try {
      devices = JSON.parse(user.devices || "[]");
    } catch {
      devices = [];
    }

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
      err => {
        if (err) {
          return res.status(500).json({ error: "Erro ao salvar dispositivo." });
        }

        const token = crypto.randomBytes(32).toString("hex");

        res.json({
          success: true,
          token,
          expires_at: user.expires_at,
          plan_months: user.plan_months
        });
      }
    );
  });
});

// CRIAR USUÁRIO COM PLANO
app.post("/admin/criar", verificarAdmin, (req, res) => {
  const { email, password, plan_months } = req.body;

  if (!email || !password || plan_months === undefined) {
    return res.status(400).json({ error: "Email, senha e plano são obrigatórios." });
  }

  const planosPermitidos = [0, 3, 6, 12];

  if (!planosPermitidos.includes(Number(plan_months))) {
    return res.status(400).json({ error: "Plano inválido." });
  }

  let expiresAt;

  if (Number(plan_months) === 0) {
    const data = new Date();
    data.setDate(data.getDate() + 2);
    expiresAt = data.toISOString();
  } else {
    expiresAt = calcularExpiracao(plan_months);
  }

  db.run(
    "INSERT INTO users (email, password, devices, plan_months, expires_at) VALUES (?, ?, ?, ?, ?)",
    [email, password, "[]", plan_months, expiresAt],
    err => {
      if (err) return res.status(400).json({ error: "Usuário já existe." });

      res.json({
        success: true,
        message: "Usuário criado com sucesso.",
        expires_at: expiresAt
      });
    }
  );
});

// LISTAR USUÁRIOS
app.get("/admin/usuarios", verificarAdmin, (req, res) => {
  db.all(
    "SELECT id, email, devices, plan_months, expires_at, created_at FROM users ORDER BY id DESC",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: "Erro ao listar usuários." });

      const usuarios = rows.map(user => {
        let devices = [];

        try {
          devices = JSON.parse(user.devices || "[]");
        } catch {
          devices = [];
        }

        return {
          id: user.id,
          email: user.email,
          dispositivos: devices.length,
          plano: `${user.plan_months} meses`,
          expires_at: user.expires_at,
          expirado: planoExpirado(user.expires_at),
          criadoEm: user.created_at
        };
      });

      res.json(usuarios);
    }
  );
});

// RENOVAR PLANO
app.post("/admin/renovar/:id", verificarAdmin, (req, res) => {
  const { id } = req.params;
  const { plan_months } = req.body;

  const mesesPermitidos = [0, 3, 6, 12];

  if (!mesesPermitidos.includes(Number(plan_months))) {
    return res.status(400).json({ error: "Plano inválido." });
  }

  let expiresAt;

  if (Number(plan_months) === 0) {
    expiresAt = calcularExpiracaoDias(2);
  } else {
    expiresAt = calcularExpiracao(plan_months);
  }

  db.run(
    "UPDATE users SET plan_months = ?, expires_at = ? WHERE id = ?",
    [plan_months, expiresAt, id],
    err => {
      if (err) return res.status(500).json({ error: "Erro ao renovar plano." });

      res.json({
        success: true,
        message: "Plano renovado com sucesso.",
        expires_at: expiresAt
      });
    }
  );
});

// RESETAR DISPOSITIVOS
app.post("/admin/resetar-dispositivos/:id", verificarAdmin, (req, res) => {
  const { id } = req.params;

  db.run("UPDATE users SET devices = ? WHERE id = ?", ["[]", id], err => {
    if (err) return res.status(500).json({ error: "Erro ao resetar dispositivos." });

    res.json({ success: true, message: "Dispositivos resetados." });
  });
});

// EXCLUIR USUÁRIO
app.delete("/admin/usuarios/:id", verificarAdmin, (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM users WHERE id = ?", [id], err => {
    if (err) return res.status(500).json({ error: "Erro ao excluir usuário." });

    res.json({ success: true, message: "Usuário excluído." });
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
