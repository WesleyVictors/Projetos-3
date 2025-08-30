// src/services/auth.js
const API_URL = process.env.REACT_APP_API_URL;

export async function registerUser(userData) {
  const response = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Erro no registro');
  }

  return data.user; // Retorna o usuário criado
}

export async function loginUser(loginData) {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(loginData),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Erro no login');
  }

  return data.user; // Retorna o usuário logado
}
