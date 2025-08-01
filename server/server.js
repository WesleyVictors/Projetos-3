require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3002;

// Configuração do Pool de Conexão com o Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Middlewares
app.use(cors()); // Permite que o frontend (em outra porta) acesse o backend
app.use(express.json()); // Permite que o servidor entenda JSON no corpo das requisições

// --- ROTAS DA API ---

// Rota de Registro de Usuário
app.post('/api/register', async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Nome, email e senha são obrigatórios.' });
  }
  try {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await pool.query(
      'INSERT INTO users (name, email, phone, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, email, phone',
      [name, email, phone, password_hash]
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (error) {
    console.error('Erro no registro:', error);
    if (error.code === '23505') { // Código de erro para violação de unicidade
      return res.status(409).json({ message: 'Este e-mail já está em uso.' });
    }
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});

// Rota de Login de Usuário
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ message: 'E-mail ou senha incorretos.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'E-mail ou senha incorretos.' });
        }

        // Não envie o hash da senha de volta para o cliente
        const { password_hash, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// Rota para buscar todos os agendamentos confirmados
app.get('/api/schedules', async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT TO_CHAR(game_date, 'YYYY-MM-DD') as date, game_time as time FROM schedules WHERE status = 'confirmed'"
        );
        // Formata os dados para o frontend
        const bookedSchedules = result.rows.reduce((acc, row) => {
            const { date, time } = row;
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(time.substring(0, 5)); // Formata HH:MM:SS para HH:MM
            return acc;
        }, {});
        res.json(bookedSchedules);
    } catch (error) {
        console.error('Erro ao buscar agendamentos:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// Rota para buscar os jogos de um usuário específico
app.get('/api/my-games/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query(
            "SELECT id, TO_CHAR(game_date, 'YYYY-MM-DD') as date, game_time as time, status FROM schedules WHERE user_id = $1 ORDER BY game_date DESC, game_time DESC",
            [userId]
        );
        // Converte o formato da hora para HH:MM
        const games = result.rows.map(game => ({
            ...game,
            time: game.time.substring(0, 5)
        }));
        res.json(games);
    } catch (error) {
        console.error('Erro ao buscar meus jogos:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// Rota para criar um novo agendamento (confirmado ou pendente)
app.post('/api/schedules', async (req, res) => {
    const { userId, date, time, status } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO schedules (user_id, game_date, game_time, status) VALUES ($1, $2, $3, $4) RETURNING *',
            [userId, date, time, status]
        );
        res.status(201).json(result.rows[0]);
    } catch (error)
    {
        console.error('Erro ao criar agendamento:', error);
        if (error.code === '23505') {
            return res.status(409).json({ message: 'Este horário já está agendado.' });
        }
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

// Rota para confirmar um pagamento (atualizar status)
app.put('/api/schedules/:gameId/confirm', async (req, res) => {
    const { gameId } = req.params;
    try {
        const result = await pool.query(
            "UPDATE schedules SET status = 'confirmed' WHERE id = $1 RETURNING *",
            [gameId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Jogo não encontrado.' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao confirmar pagamento:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});


app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
