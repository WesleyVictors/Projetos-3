import React, { useState, useEffect, useCallback } from 'react';
// Importando todos os ícones necessários da biblioteca lucide-react.
import { Calendar, Gamepad2, User, ArrowLeft, Watch, Trophy, Plus, Minus, Users, ChevronLeft, ChevronRight, CheckCircle, Copy, LogOut, ShieldCheck, Mail, Phone, Lock, DollarSign, AlertCircle } from 'lucide-react';
// import de animações 
import { motion, AnimatePresence } from 'framer-motion';

import { registerUser, loginUser } from './services/api';

const allPossibleTimes = ["09:00", "10:30", "12:00", "14:30", "16:00", "17:30", "18:30", "20:00", "21:30", "23:00"];
// PREÇO ATUALIZADO
const price = "R$ 2,00"; // Preço padrão da quadra, que poderia vir de uma configuração do backend.

// --- Funções Utilitárias ---
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    return [year, month, day].join('-');
}

const API_URL = process.env.REACT_APP_API_URL;

// --- Componente Principal da Aplicação ---
// O `App` é o "cérebro" da aplicação. Ele controla qual tela é exibida e gerencia os dados principais.
export default function App() {
  // --- Gerenciamento de Estado (useState) ---
  // `screen`: Guarda o nome da tela atual que deve ser mostrada ao usuário.
  const [screen, setScreen] = useState('welcome');
  // `user`: Armazena os dados do usuário logado (null se ninguém estiver logado).
  const [user, setUser] = useState(null);
  // `authError`: Guarda mensagens de erro para as telas de login/cadastro.
  const [authError, setAuthError] = useState('');
  // `selectedSchedule`: Armazena a data e hora que o usuário seleciona no calendário.
  const [selectedSchedule, setSelectedSchedule] = useState({ date: null, time: null });
  // `myGames`: Lista de jogos agendados pelo usuário (confirmados ou pendentes).
  const [myGames, setMyGames] = useState([]);
  // `bookedSchedules`: Lista de todos os horários já ocupados, para bloquear o calendário.
  const [bookedSchedules, setBookedSchedules] = useState({});
  // `gameToPay`: Armazena temporariamente o jogo que o usuário decidiu pagar.
  const [gameToPay, setGameToPay] = useState(null);
  
  // ESTADO DAS FERRAMENTAS "LEVANTADO" PARA O COMPONENTE PAI (APP)
  // Agora, o placar e o cronômetro são controlados aqui, para que seus valores persistam entre as navegações.
  const [scoreboard, setScoreboard] = useState({ scoreA: 0, scoreB: 0 });
  const [stopwatch, setStopwatch] = useState({ time: 0, isRunning: false });
  // Novo estado para controlar a direção da animação da tela
  const [direction, setDirection] = useState(0);

  // Efeito para buscar os agendamentos confirmados quando o app carrega
  const MyComponent = () => {
  const [schedules, setSchedules] = useState([]);
  const [error, setError] = useState(null);

  // Buscar agendamentos ao montar o componente
  useEffect(() => {
    getSchedules()
      .then(data => setSchedules(data))
      .catch(err => setError(err.message));
  }, []);

  // Função para criar novo agendamento
  const handleNewSchedule = async () => {
    try {
      const newItem = { date: "2025-08-30", time: "18:00" };
      const saved = await createSchedule(newItem);
      setSchedules(prev => [...prev, saved]);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <ul>
        {schedules.map((s, index) => (
          <li key={index}>{s.date} - {s.time}</li>
        ))}
      </ul>
      <button onClick={handleNewSchedule}>Adicionar Agendamento</button>
    </div>
  );
};


  // --- Funções de Lógica de Negócio ---

  // `navigate`: Função para mudar de tela. `useCallback` otimiza a performance.
  const navigate = useCallback((screenName, dir = 1) => {
    setDirection(dir);
    setAuthError(''); // Limpa erros de autenticação ao navegar para uma nova tela.
    setScreen(screenName);
  }, []);

  // `handleRegister`: Lida com o cadastro de um novo usuário.
  const handleRegister = async (userData) => {
  try {
    const user = await registerUser(userData);
    handleAuthSuccess(user);
  } catch (error) {
    setAuthError(error.message);
  }
};

const handleLogin = async (loginData) => {
  try {
    const user = await loginUser(loginData);
    handleAuthSuccess(user);
  } catch (error) {
    setAuthError(error.message);
  }
};

  // `handleAuthSuccess`: Centraliza as ações a serem tomadas após login/cadastro bem-sucedido.
  const handleAuthSuccess = async (userData) => {
    setUser(userData); // Define o usuário atual.
    setAuthError(''); // Limpa qualquer erro anterior.
    // Busca os jogos do usuário logado
    try {
        const response = await fetch(`${API_URL}/my-games/${userData.id}`);
        const games = await response.json();
        setMyGames(games.map(g => ({...g, date: new Date(g.date)}))); // Converte string de data para objeto Date
    } catch (error) {
        console.error("Erro ao buscar jogos do usuário:", error);
    }
    navigate('home', 1); // Navega para a tela principal.
  };

  // `handleLogout`: Desconecta o usuário.
  const handleLogout = () => {
    setUser(null);
    setMyGames([]);
    navigate('welcome', -1);
  };

  // `handleSelectSchedule`: Chamada quando o usuário clica em um horário disponível.
  const handleSelectSchedule = (date, time) => {
    setSelectedSchedule({ date, time });
    navigate('scheduling');
  };
  
  // `handleReserveBooking`: Lida com a reserva de um jogo com pagamento pendente.
  const handleReserveBooking = async () => {
    if (!user) return;
    try {
        const newGameData = {
            userId: user.id,
            date: formatDate(selectedSchedule.date),
            time: selectedSchedule.time,
            status: 'pending'
        };
        const response = await fetch(`${API_URL}/schedules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newGameData),
        });
        const savedGame = await response.json();
        setMyGames(prevGames => [{...savedGame, date: new Date(savedGame.game_date)}, ...prevGames]);
        navigate('my-games', 1);
    } catch (error) {
        console.error("Erro ao reservar horário:", error);
    }
  };

  // `handleGoToPaymentFromScheduling`: Prepara para o pagamento vindo da tela de agendamento.
  const handleGoToPaymentFromScheduling = () => {
    // Cria um ID temporário para o jogo que ainda não foi salvo.
    const tempGame = { ...selectedSchedule, id: 'new-' + Date.now() };
    setGameToPay(tempGame); // Define qual jogo será pago. // A direção será 1 (forward) por padrão    navigate('payment');
  }; // A direção será 1 (forward) por padrão
  
  // `handleGoToPaymentFromMyGames`: Prepara para o pagamento vindo da lista "Meus Jogos".
  const handleGoToPaymentFromMyGames = (game) => {
    setGameToPay(game);
    navigate('payment');
  };

  // `handleConfirmPayment`: Finaliza o processo de pagamento.
  const handleConfirmPayment = async (gameId) => {
    const gameBeingPaid = gameToPay;
    if (!gameBeingPaid) return; // Segurança para evitar erros.
    
    try {
        const isNewGame = typeof gameId === 'string' && gameId.startsWith('new-');

        if (isNewGame) {
            // Se for novo, cria um agendamento confirmado no banco
            const newGameData = {
                userId: user.id,
                date: formatDate(gameBeingPaid.date),
                time: gameBeingPaid.time,
                status: 'confirmed'
            };
            await fetch(`${API_URL}/schedules`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newGameData),
            });
        } else {
            // Se já existia, apenas atualiza seu status para 'confirmed' no banco
            await fetch(`${API_URL}/schedules/${gameId}/confirm`, { method: 'PUT' });
        }

        // Atualiza a lista de jogos do usuário e os horários bloqueados
        const [gamesResponse, schedulesResponse] = await Promise.all([
            fetch(`${API_URL}/my-games/${user.id}`),
            fetch(`${API_URL}/schedules`)
        ]);

        const games = await gamesResponse.json();
        const schedules = await schedulesResponse.json();

        setMyGames(games.map(g => ({...g, date: new Date(g.date)})));
        setBookedSchedules(schedules);
        
        setGameToPay(null); // Limpa o estado do jogo a ser pago.
        navigate('confirmation', 1); // Mostra a tela de sucesso.
    } catch (error) {
        console.error("Erro ao confirmar pagamento:", error);
    }
  };

  // --- Lógica de Animação ---
  const screenVariants = {
    enter: (direction) => ({
      x: direction === 0 ? 0 : direction > 0 ? '100%' : '-100%',
      opacity: direction === 0 ? 1 : 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
    }),
  };
  // --- Renderização ---
  // A função `renderScreen` atua como um roteador, decidindo qual componente de tela mostrar.
  const renderScreen = () => {
    switch (screen) {
      case 'welcome': return <WelcomeScreen navigate={navigate} />;
      case 'login': return <LoginScreen navigate={navigate} onLogin={handleLogin} error={authError} />;
      case 'register': return <RegisterScreen navigate={navigate} onRegister={handleRegister} error={authError} />;
      case 'home': return <HomeScreen user={user} navigate={navigate} onSelectSchedule={handleSelectSchedule} bookedSchedules={bookedSchedules} />;
      // Passando o estado das ferramentas e seus setters para a tela de Ferramentas.
      case 'tools': return <ToolsScreen navigate={navigate} stopwatch={stopwatch} setStopwatch={setStopwatch} scoreboard={scoreboard} setScoreboard={setScoreboard}/>;
      case 'team-draft': return <TeamDraftScreen navigate={navigate} />;
      case 'profile': return <ProfileScreen user={user} navigate={navigate} onLogout={handleLogout} />;
      case 'scheduling': return <SchedulingScreen navigate={navigate} schedule={selectedSchedule} onReserve={handleReserveBooking} onGoToPayment={handleGoToPaymentFromScheduling} />;
      case 'payment': return <PaymentScreen navigate={navigate} schedule={gameToPay} onConfirmPayment={handleConfirmPayment} />;
      case 'confirmation': return <ConfirmationScreen navigate={navigate} />;
      case 'my-games': return <MyGamesScreen navigate={navigate} games={myGames} onGoToPayment={handleGoToPaymentFromMyGames} />;
      default: return <WelcomeScreen navigate={navigate} />;
    }
  };

  // O `return` do componente `App` define a estrutura visual base do aplicativo.
  return (
     <div className="bg-gray-800 flex justify-center items-center min-h-screen font-sans">
      <div className="w-full max-w-sm h-[844px] bg-black shadow-2xl overflow-hidden flex flex-col relative">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={screen}
            custom={direction}
            variants={screenVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="h-full w-full absolute top-0 left-0 flex flex-col"
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- Componentes de Tela ---
// Cada componente abaixo representa uma tela diferente da aplicação.

// Tela de Boas-vindas: A primeira tela que o usuário vê.
const WelcomeScreen = ({ navigate }) => (
    <div className="flex-grow flex flex-col justify-center items-center p-8 bg-black text-white text-center">
        <div className="flex-grow flex flex-col justify-center items-center"> 
            <h1 className="text-6xl font-bold tracking-wider">ARENA</h1> 
            <h1 className="text-6xl font-bold tracking-wider">FUT</h1>
        </div>
        <div className="w-full">
            <button onClick={() => navigate('login')} className="w-full bg-gray-700 text-white font-bold py-3 px-4 rounded-lg mb-4 hover:bg-gray-600 transition-colors">Entrar</button>
            <button onClick={() => navigate('register')} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-500 transition-colors">Criar Conta</button>
        </div>
    </div>
);

// Componente reutilizável para os formulários de Login e Cadastro.
const AuthScreen = ({ type, navigate, onAuth, error }) => {
    const isRegister = type === 'register';
    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const userData = Object.fromEntries(formData.entries());
        onAuth(userData); // Chama a função de login ou registro passada pelo App.
    };

    return (
        <div className="h-full flex flex-col p-6 bg-black text-white">
            <Header title={isRegister ? "Criar Conta" : "Entrar"} onBack={() => navigate('welcome', -1)} />
            <p className="text-gray-400 mb-4">{isRegister ? "Complete os campos para se registrar." : "Bem-vindo de volta!"}</p>
            
            {/* Exibe uma mensagem de erro, se houver. */}
            {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-lg mb-4 flex items-center">
                    <AlertCircle size={20} className="mr-3"/>
                    <span>{error}</span>
                </div>
            )}
            
            <form onSubmit={handleSubmit} className="flex-grow flex flex-col space-y-4">
                {isRegister && <InputField label="Nome Completo" name="name" type="text" Icon={User} />}
                <InputField label="Email" name="email" type="email" Icon={Mail} />
                {isRegister && <InputField label="Telefone" name="phone" type="tel" Icon={Phone} />}
                <InputField label="Senha" name="password" type="password" Icon={Lock} />
                <div className="flex-grow"></div>
                <button className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-500 transition-colors" type="submit">
                    {isRegister ? 'Criar Conta e Entrar' : 'Entrar'}
                </button>
            </form>
        </div>
    );
};

// Componentes específicos para Login e Cadastro que usam o AuthScreen genérico.
const RegisterScreen = ({ navigate, onRegister, error }) => <AuthScreen type="register" navigate={navigate} onAuth={onRegister} error={error} />;
const LoginScreen = ({ navigate, onLogin, error }) => <AuthScreen type="login" navigate={navigate} onAuth={onLogin} error={error} />;

// Tela Principal (Home): Exibe o calendário para agendamento.
const HomeScreen = ({ user, navigate, onSelectSchedule, bookedSchedules }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    
    // Filtra os horários do dia para mostrar apenas os disponíveis.
    const availableTimesForDate = allPossibleTimes.filter(
        time => !bookedSchedules[formatDate(selectedDate)]?.includes(time)
    );

    return (
        <div className="flex-grow flex flex-col bg-black text-white">
            <header className="p-6">
                <h1 className="text-2xl font-bold">Olá, {user?.name?.split(' ')[0] || 'Jogador(a)'}!</h1>
                <p className="text-gray-400">Selecione uma data para agendar.</p>
            </header>
            <main className="flex-grow p-6 pt-0 overflow-y-auto">
                <CalendarComponent selectedDate={selectedDate} onDateSelect={setSelectedDate} bookedSchedules={bookedSchedules}/>
                <h3 className="font-bold text-lg mt-6 mb-4">Horários para {selectedDate.toLocaleDateString('pt-BR', {day: '2-digit', month: 'long'})}</h3>
                <div className="grid grid-cols-3 gap-3">
                    {availableTimesForDate.length > 0 ? availableTimesForDate.map(time => (
                        <button key={time} onClick={() => onSelectSchedule(selectedDate, time)} className="bg-gray-800 p-3 rounded-lg text-center hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <p className="font-semibold text-base">{time}</p>
                        </button>
                    )) : <p className="col-span-3 text-center text-gray-500 py-4">Nenhum horário disponível.</p>}
                </div>
            </main>
            <BottomNavBar activeScreen="home" navigate={navigate} />
        </div>
    );
};

// Tela de Ferramentas: Agora recebe o estado e os setters como props.
const ToolsScreen = ({ navigate, stopwatch, setStopwatch, scoreboard, setScoreboard }) => (
  <div className="flex-grow flex flex-col bg-black text-white">
      <Header title="Ferramentas de Jogo" onBack={() => navigate('home', -1)} />
      <main className="flex-grow flex flex-col justify-center items-center p-6 space-y-6">
        <Stopwatch stopwatch={stopwatch} setStopwatch={setStopwatch} />
        <Scoreboard scoreboard={scoreboard} setScoreboard={setScoreboard} />
      </main>
      <div className="p-6">
          <button onClick={() => navigate('team-draft', 1)} className="w-full bg-gray-700 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center">
            <Users size={20} className="mr-2"/>
            Sortear Times
          </button>
      </div>
    <BottomNavBar activeScreen="tools" navigate={navigate} />
  </div>
);

// Tela de Sorteio de Times.
const TeamDraftScreen = ({ navigate }) => {
    const [players, setPlayers] = useState('');
    const [teams, setTeams] = useState(null);

    const handleDraft = () => {
        // Lógica para separar os nomes e sortear os times.
        const playerList = players.split(/[,;\n]/).map(p => p.trim()).filter(Boolean);
        if (playerList.length < 2) return;
        playerList.sort(() => Math.random() - 0.5); // Embaralha a lista de jogadores.
        const numTeams = Math.ceil(playerList.length / 5); // Define no máximo 5 por time.
        const draftedTeams = Array.from({ length: numTeams }, () => []);
        playerList.forEach((player, index) => {
            draftedTeams[index % numTeams].push(player);
        });
        setTeams(draftedTeams);
    };

    return (
        <div className="flex-grow flex flex-col bg-black text-white">
            <Header title="Sortear Times" onBack={() => navigate('tools', -1)} />
            <main className="flex-grow p-6">
                <textarea 
                    className="w-full h-40 bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 mb-4"
                    placeholder="Insira os nomes dos jogadores, separados por vírgula, ponto e vírgula ou um por linha."
                    value={players}
                    onChange={(e) => setPlayers(e.target.value)}
                />
                <button onClick={handleDraft} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-500 transition-colors">Sortear Times</button>
                
                {teams && (
                    <div className="mt-6 space-y-4 animate-fade-in">
                        {teams.map((team, index) => (
                            <div key={index} className="bg-gray-800 p-4 rounded-lg">
                                <h3 className="font-bold text-lg text-blue-400 mb-2">Time {index + 1}</h3>
                                <p className="text-gray-300">{team.join(', ')}</p>
                            </div>
                        ))}
                    </div>
                )}
            </main>
             <BottomNavBar activeScreen="tools" navigate={navigate} />
        </div>
    );
};

// Tela de Perfil do Usuário.
const ProfileScreen = ({ user, navigate, onLogout }) => (
    <div className="flex-grow flex flex-col bg-black text-white">
        <Header title="Meu Perfil" onBack={() => navigate('home', -1)} />
        <main className="flex-grow flex flex-col items-center p-6 text-center">
            <User size={80} className="mb-6 text-blue-500" />
            <h2 className="text-2xl font-bold">{user?.name}</h2>
            <div className="flex items-center space-x-2 text-gray-400 mt-2">
                <Mail size={16} />
                <span>{user?.email}</span>
            </div>
            {user?.phone && (
                 <div className="flex items-center space-x-2 text-gray-400 mt-1">
                    <Phone size={16} />
                    <span>{user.phone}</span>
                </div>
            )}
            <div className="w-full mt-auto space-y-4">
              <button onClick={() => navigate('my-games', 1)} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-500 transition-colors">Meus Jogos</button>
              <button onClick={onLogout} className="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-red-500 transition-colors flex items-center justify-center">
                <LogOut size={20} className="mr-2"/>
                Sair
              </button>
            </div>
        </main>
        <BottomNavBar activeScreen="profile" navigate={navigate} />
    </div>
);

// Tela de Resumo do Agendamento antes do pagamento.
const SchedulingScreen = ({ navigate, schedule, onReserve, onGoToPayment }) => (
    <div className="flex-grow flex flex-col bg-black text-white">
        <Header title="Confirmar Agendamento" onBack={() => navigate('home', -1)} />
        <main className="flex-grow flex flex-col items-center justify-center p-6 text-center">
            <p className="text-gray-400 mb-2">Você selecionou o horário:</p>
            <h2 className="text-5xl font-bold mb-8">{schedule.time}</h2>
            <div className="bg-gray-800 rounded-lg p-6 w-full text-left mb-8 space-y-2">
                <p><strong>Data:</strong> {schedule.date?.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p><strong>Horário:</strong> {schedule.time}</p>
                <p><strong>Preço:</strong> {price}</p>
            </div>
             <button onClick={onGoToPayment} className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-400 transition-colors mb-4">Pagar Agora e Confirmar</button>
             <button onClick={onReserve} className="w-full bg-gray-700 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-600 transition-colors">Reservar (Pagar Depois)</button>
        </main>
        <BottomNavBar activeScreen="home" navigate={navigate} />
    </div>
);

// Tela de Pagamento via PIX.
const PaymentScreen = ({ navigate, schedule, onConfirmPayment }) => {
    const pixCode = "00020126360014br.gov.bcb.pix0114+5511999999999520400005303986540490.005802BR5913NOME DO DONO6008BRASILIA62070503***6304E4A7";
    const [copied, setCopied] = useState(false);

    // Lógica para copiar o código PIX para a área de transferência.
    const handleCopy = () => {
        const textArea = document.createElement("textarea");
        textArea.value = pixCode;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Falha ao copiar: ', err);
        }
        document.body.removeChild(textArea);
    };

    return (
        <div className="flex-grow flex flex-col bg-black text-white">
            <Header title="Pagamento via PIX" onBack={() => navigate('my-games', -1)} />
            <main className="flex-grow flex flex-col items-center p-6 text-center">
                <p className="text-gray-400 mb-4">Para confirmar o jogo no horário <br/> <span className="font-bold text-white">{schedule?.time} de {schedule?.date?.toLocaleDateString('pt-BR')}</span>, pague via PIX.</p>
                <div className="bg-white p-2 rounded-lg mb-4">
                    <img src="https://placehold.co/256x256/ffffff/000000?text=QR+CODE" alt="QR Code PIX" className="w-48 h-48 mx-auto" />
                </div>
                <div className="w-full mb-4">
                     <button onClick={handleCopy} className="w-full bg-gray-700 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center">
                        <Copy size={20} className="mr-2"/>
                        {copied ? 'Copiado!' : 'Copiar Código PIX'}
                    </button>
                </div>
                <div className="mt-auto w-full">
                    <button onClick={() => onConfirmPayment(schedule.id)} className="w-full bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-400 transition-colors">Já fiz o pagamento</button>
                </div>
            </main>
            <BottomNavBar activeScreen="profile" navigate={navigate} />
        </div>
    );
};

// Tela de Confirmação de Sucesso.
const ConfirmationScreen = ({ navigate }) => (
    <div className="flex-grow flex flex-col bg-black text-white items-center justify-center p-6 text-center">
        <CheckCircle size={80} className="text-green-500 mb-6" />
        <h1 className="text-3xl font-bold mb-2">Agendamento Confirmado!</h1>
        <p className="text-gray-400 mb-8">O seu jogo está marcado. Ele já aparece na seção "Meus Jogos" em seu perfil.</p>
        <div className="w-full space-y-4">
           <button onClick={() => navigate('my-games', 1)} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-500 transition-colors">Ver Meus Jogos</button>
           <button onClick={() => navigate('home', 1)} className="w-full bg-gray-700 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-600 transition-colors">Agendar Outro Horário</button>
        </div>
    </div>
);

// Tela "Meus Jogos": Lista os jogos do usuário, confirmados ou pendentes.
const MyGamesScreen = ({ navigate, games, onGoToPayment }) => (
    <div className="flex-grow flex flex-col bg-black text-white">
        <Header title="Meus Jogos" onBack={() => navigate('profile', -1)} />
        <main className="flex-grow p-6 space-y-4 overflow-y-auto">
            {games.length > 0 ? games.map(game => (
                <div key={game.id} className="bg-gray-800 rounded-lg p-4 w-full text-left">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-bold text-lg">Jogo de {game.date?.toLocaleDateString('pt-BR', { weekday: 'long' })}</p>
                            <p className="text-gray-400">{game.date?.toLocaleDateString('pt-BR')} - {game.time}</p>
                        </div>
                        {game.status === 'confirmed' ? (
                             <div className="text-right">
                                <p className="font-semibold text-green-400">Confirmado</p>
                                <CheckCircle size={20} className="text-green-400 inline-block"/>
                            </div>
                        ) : (
                             <div className="text-right">
                                <p className="font-semibold text-yellow-400">Pendente</p>
                                <p className="text-xs text-gray-500">Pagamento necessário</p>
                            </div>
                        )}
                    </div>
                    {/* Botão de pagamento só aparece para jogos pendentes. */}
                    {game.status === 'pending' && (
                        <button onClick={() => onGoToPayment(game)} className="w-full mt-4 bg-yellow-500 text-black font-bold py-2 px-4 rounded-lg hover:bg-yellow-400 transition-colors flex items-center justify-center">
                            <DollarSign size={20} className="mr-2"/>
                            Pagar Agora
                        </button>
                    )}
                </div>
            )) : (
                <div className="text-center text-gray-500 pt-16">
                    <Calendar size={48} className="mx-auto mb-4"/>
                    <p>Você ainda não tem jogos agendados.</p>
                </div>
            )}
        </main>
        <BottomNavBar activeScreen="profile" navigate={navigate} />
    </div>
);

// --- Componentes Reutilizáveis e de Lógica ---

// Header: Cabeçalho padrão usado em várias telas.
const Header = ({ title, onBack }) => (
  <header className="p-6 flex items-center relative h-20 shrink-0">
    <button onClick={onBack} className="text-gray-400 hover:text-white absolute left-6 p-2">
      <ArrowLeft size={24} />
    </button>
    <h1 className="text-xl font-bold text-center w-full">{title}</h1>
  </header>
);

// InputField: Componente de campo de formulário com ícone.
const InputField = ({ label, name, type, Icon }) => (
    <div className="relative">
        <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor={name}>{label}</label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
             <Icon className="text-gray-500" size={20} />
          </span>
          <input className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500" id={name} name={name} type={type} required />
        </div>
    </div>
);

// BottomNavBar: Barra de navegação inferior.
const BottomNavBar = ({ activeScreen, navigate }) => (
    <div className="w-full bg-gray-900/80 backdrop-blur-sm p-2 flex justify-around items-center sticky bottom-0 mt-auto border-t border-gray-800 shrink-0">
        <button onClick={() => navigate('home', 0)} className={`flex flex-col items-center p-2 rounded-lg transition-colors w-20 ${activeScreen === 'home' ? 'text-blue-500' : 'text-gray-400 hover:text-white'}`}>
            <Calendar size={24} />
            <span className="text-xs mt-1">Agenda</span>
        </button>
        <button onClick={() => navigate('tools', 0)} className={`flex flex-col items-center p-2 rounded-lg transition-colors w-20 ${activeScreen === 'tools' ? 'text-blue-500' : 'text-gray-400 hover:text-white'}`}>
            <Gamepad2 size={24} />
            <span className="text-xs mt-1">Ferramentas</span>
        </button>
        <button onClick={() => navigate('profile', 0)} className={`flex flex-col items-center p-2 rounded-lg transition-colors w-20 ${activeScreen === 'profile' ? 'text-blue-500' : 'text-gray-400 hover:text-white'}`}>
            <User size={24} />
            <span className="text-xs mt-1">Perfil</span>
        </button>
    </div>
);

// Componente do Calendário Interativo.
const CalendarComponent = ({ selectedDate, onDateSelect, bookedSchedules }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const changeMonth = (amount) => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + amount, 1));

    return (
        <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex justify-between items-center mb-4 px-2">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-700"><ChevronLeft size={20} /></button>
                <span className="font-bold text-lg">{currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-700"><ChevronRight size={20} /></button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs text-gray-400 mb-2">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => <div key={index}>{day}</div>)}
            </div>
            <CalendarCells currentMonth={currentMonth} selectedDate={selectedDate} today={today} onDateSelect={onDateSelect} bookedSchedules={bookedSchedules}/>
        </div>
    );
};

// Componente que renderiza as células (dias) do calendário.
const CalendarCells = ({ currentMonth, selectedDate, today, onDateSelect, bookedSchedules }) => {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const startDate = new Date(monthStart);
    startDate.setDate(startDate.getDate() - monthStart.getDay());
    const rows = [];
    let days = [];
    let day = startDate;

    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 7; j++) {
            const dayClone = new Date(day);
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
            const isPast = day < today;
            const isSelected = formatDate(day) === formatDate(selectedDate);
            const isFullyBooked = bookedSchedules[formatDate(day)]?.length === allPossibleTimes.length;
            const isDisabled = isPast || (isCurrentMonth && isFullyBooked);

            days.push(
                <div className="p-1" key={day.toISOString()}>
                    <button 
                        onClick={() => !isDisabled && onDateSelect(dayClone)}
                        disabled={isDisabled}
                        className={`w-full h-10 rounded-full text-sm transition-colors
                            ${!isCurrentMonth ? 'text-gray-600' : ''}
                            ${isDisabled ? 'text-gray-500 cursor-not-allowed line-through' : 'hover:bg-gray-700'}
                            ${isSelected ? 'bg-blue-600 text-white font-bold' : ''}
                        `}
                    >
                        {day.getDate()}
                    </button>
                </div>
            );
            day.setDate(day.getDate() + 1);
        }
        rows.push(<div className="grid grid-cols-7" key={i}>{days}</div>);
        days = [];
    }
    return <div>{rows}</div>;
}

// Componente do Cronômetro. Agora é um "componente controlado".
// Ele não tem estado próprio; recebe tudo via props do componente App.
const Stopwatch = ({ stopwatch, setStopwatch }) => {
    const { time, isRunning } = stopwatch;

    useEffect(() => {
        let interval = null;
        if (isRunning) {
            interval = setInterval(() => {
                setStopwatch(sw => ({ ...sw, time: sw.time + 1 }));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRunning, setStopwatch]);

    const formatTime = (sec) => {
        const minutes = Math.floor(sec / 60).toString().padStart(2, '0');
        const seconds = (sec % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    };

    const handleToggle = () => {
        setStopwatch(sw => ({ ...sw, isRunning: !sw.isRunning }));
    };

    const handleReset = () => {
        setStopwatch({ time: 0, isRunning: false });
    };

    return (
        <div className="w-full bg-gray-800 rounded-xl p-6 text-center">
            <h3 className="font-bold text-lg mb-4">Cronômetro</h3>
            <div className="text-6xl font-mono mb-4 tabular-nums">{formatTime(time)}</div>
            <div className="space-x-4">
                <button onClick={handleToggle} className="bg-green-500 text-white font-bold py-2 px-6 rounded-lg w-28">{isRunning ? 'Pausar' : 'Iniciar'}</button>
                <button onClick={handleReset} className="bg-red-500 text-white font-bold py-2 px-6 rounded-lg w-28">Resetar</button>
            </div>
        </div>
    );
};

// Componente do Placar. Também é um "componente controlado".
const Scoreboard = ({ scoreboard, setScoreboard }) => {
    const { scoreA, scoreB } = scoreboard;

    const handleScoreChange = (team, value) => {
        if (team === 'A') {
            setScoreboard(s => ({ ...s, scoreA: Math.max(0, s.scoreA + value) }));
        } else {
            setScoreboard(s => ({ ...s, scoreB: Math.max(0, s.scoreB + value) }));
        }
    };

    return (
        <div className="w-full bg-gray-800 rounded-xl p-6 text-center">
            <h3 className="font-bold text-lg mb-4">Placar</h3>
            <div className="flex justify-around items-center">
                <ScoreControl score={scoreA} onScoreChange={(v) => handleScoreChange('A', v)} />
                <div className="text-2xl font-bold text-gray-500">X</div>
                <ScoreControl score={scoreB} onScoreChange={(v) => handleScoreChange('B', v)} />
            </div>
        </div>
    );
};

// Componente para controlar um placar individual.
const ScoreControl = ({ score, onScoreChange }) => (
    <div className="flex-1 flex flex-col items-center space-y-2">
        <p className="text-6xl font-bold tabular-nums">{score}</p>
        <div className="flex space-x-3">
             <button onClick={() => onScoreChange(-1)} className="bg-gray-700 p-2 rounded-full text-red-400"><Minus size={20}/></button>
            <button onClick={() => onScoreChange(1)} className="bg-gray-700 p-2 rounded-full text-green-400"><Plus size={20}/></button>
        </div>
    </div>
);
