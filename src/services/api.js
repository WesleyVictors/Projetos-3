const API_URL = process.env.REACT_APP_API_URL;

export async function getSchedules() {
  const response = await fetch(`${API_URL}/schedules`);
  if (!response.ok) {
    throw new Error("Erro ao carregar agendamentos");
  }
  return response.json();
}

export async function createSchedule(newSchedule) {
  const response = await fetch(`${API_URL}/schedules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newSchedule),
  });
  if (!response.ok) {
    throw new Error("Erro ao criar agendamento");
  }
  return response.json();
}
