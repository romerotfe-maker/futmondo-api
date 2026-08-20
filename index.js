const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

// Inlined exactStats data (Zero local module dependency)
const exactStatsObj = {
  "aeromarc": { "exactInitialSquadDay1": 94383784, "exactStartingCash": 205616216, "totalBuys": 488865902, "totalSales": 328687010, "tradingProfit": 5522503, "exactCalculatedCash": 45437324, "squadVal": 296995305, "netWorth": 346802310, "playersCount": 16 },
  "Borja ✈️🎧⚽️⛳️": { "exactInitialSquadDay1": 92655283, "exactStartingCash": 207344717, "totalBuys": 711504291, "totalSales": 598508458, "tradingProfit": 13062629, "exactCalculatedCash": 94348884, "squadVal": 286535241, "netWorth": 341739788, "playersCount": 13 },
  "ivanabyan83": { "exactInitialSquadDay1": 100236262, "exactStartingCash": 199763738, "totalBuys": 560989999, "totalSales": 356618038, "tradingProfit": -21212653, "exactCalculatedCash": -4608223, "squadVal": 263525346, "netWorth": 264235185, "playersCount": 12 },
  "gracioguemes": { "exactInitialSquadDay1": 98667637, "exactStartingCash": 201332363, "totalBuys": 411689993, "totalSales": 212236161, "tradingProfit": -6900627, "exactCalculatedCash": 1878531, "squadVal": 274575633, "netWorth": 267268371, "playersCount": 14 },
  "Mario Toledano": { "exactInitialSquadDay1": 99137681, "exactStartingCash": 200862319, "totalBuys": 265482824, "totalSales": 64784629, "tradingProfit": 0, "exactCalculatedCash": 164124, "squadVal": 297153386, "netWorth": 300337605, "playersCount": 15 },
  "Carlos Romero": { "exactInitialSquadDay1": 101312683, "exactStartingCash": 198687317, "totalBuys": 341744131, "totalSales": 170967438, "tradingProfit": 1746916, "exactCalculatedCash": 27910624, "squadVal": 254738738, "netWorth": 283489104, "playersCount": 19 },
  "Juan Ramon": { "exactInitialSquadDay1": 97387139, "exactStartingCash": 202612861, "totalBuys": 193062101, "totalSales": 0, "tradingProfit": 0, "exactCalculatedCash": 9550760, "squadVal": 276485407, "netWorth": 309757815, "playersCount": 20 },
  "Arturo Muradás": { "exactInitialSquadDay1": 100621274, "exactStartingCash": 199378726, "totalBuys": 394775000, "totalSales": 194266923, "tradingProfit": 3084683, "exactCalculatedCash": -1129351, "squadVal": 283123892, "netWorth": 283392748, "playersCount": 14 },
  "Capitan Maple": { "exactInitialSquadDay1": 108097026, "exactStartingCash": 191902974, "totalBuys": 222523295, "totalSales": 16255676, "tradingProfit": 0, "exactCalculatedCash": -14364645, "squadVal": 202807764, "netWorth": 206209440, "playersCount": 15 },
  "Rivers FC": { "exactInitialSquadDay1": 95269664, "exactStartingCash": 204730336, "totalBuys": 157116641, "totalSales": 2211014, "tradingProfit": 0, "exactCalculatedCash": 49824709, "squadVal": 227454810, "netWorth": 284466687, "playersCount": 18 },
  "jeromuradas": { "exactInitialSquadDay1": 98805881, "exactStartingCash": 201194119, "totalBuys": 139094786, "totalSales": 33832586, "tradingProfit": 0, "exactCalculatedCash": 95931919, "squadVal": 179424161, "netWorth": 277070058, "playersCount": 15 }
};
const exactStats = exactStatsObj;

// Inlined Clause Tracker (Zero local module dependency)
const HISTORY_FILE = path.join(__dirname, 'data', 'clause_history.json');
function ensureDataDir() {
  const dir = path.join(__dirname, 'data');
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
  }
}
function loadHistory() {
  ensureDataDir();
  if (fs.existsSync(HISTORY_FILE)) {
    try { return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')); } catch (e) {}
  }
  return { snapshots: {}, rivalClauseSpent: {} };
}
function saveHistory(data) {
  ensureDataDir();
  try { fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2), 'utf8'); } catch (e) {}
}
function recordRosterSnapshot(championshipId, rivalsRosters) {
  const history = loadHistory();
  if (!history.snapshots[championshipId]) history.snapshots[championshipId] = [];
  if (!history.rivalClauseSpent[championshipId]) history.rivalClauseSpent[championshipId] = {};

  const timestamp = new Date().toISOString();
  const currentSnapshot = { timestamp, teams: {} };
  const prevSnapshots = history.snapshots[championshipId];
  const lastSnapshot = prevSnapshots.length > 0 ? prevSnapshots[prevSnapshots.length - 1] : null;

  rivalsRosters.forEach(rival => {
    const teamId = rival.id;
    currentSnapshot.teams[teamId] = {};
    if (!history.rivalClauseSpent[championshipId][teamId]) history.rivalClauseSpent[championshipId][teamId] = 0;

    (rival.players || []).forEach(player => {
      const clausePrice = player.clause || 0;
      currentSnapshot.teams[teamId][player.id] = { name: player.name, clause: clausePrice, value: player.currentValue || 0, buyPrice: player.buyPrice || 0 };

      if (lastSnapshot && lastSnapshot.teams[teamId] && lastSnapshot.teams[teamId][player.id]) {
        const prevClause = lastSnapshot.teams[teamId][player.id].clause || 0;
        if (clausePrice > prevClause) {
          const deltaClause = clausePrice - prevClause;
          const cashSpent = deltaClause / 2;
          history.rivalClauseSpent[championshipId][teamId] += cashSpent;
        }
      }
    });
  });

  history.snapshots[championshipId].push(currentSnapshot);
  if (history.snapshots[championshipId].length > 60) history.snapshots[championshipId] = history.snapshots[championshipId].slice(-60);
  saveHistory(history);
  return history.rivalClauseSpent[championshipId];
}

function getRivalClauseSpent(championshipId, teamId) {
  const history = loadHistory();
  let totalSpent = history.rivalClauseSpent[championshipId]?.[teamId] || 0;
  const customPath = path.join(__dirname, 'data', 'custom_clause_raises.json');
  if (fs.existsSync(customPath)) {
    try {
      const customData = JSON.parse(fs.readFileSync(customPath, 'utf8'));
      const teamCustom = customData[teamId] || [];
      totalSpent += teamCustom.reduce((sum, item) => sum + (Number(item.cashSpent) || 0), 0);
    } catch (e) {}
  }
  if ((teamId === '67321fc2344b5c3e5d0bba90' || teamId === '6a71d8813c7e1c3cdc724971') && totalSpent === 0) {
    totalSpent = 1500000;
  }
  return totalSpent;
}


const BASE_URL = process.env.FUTMONDO_BASE_URL || 'https://api.futmondo.com';
const TOKEN = process.env.FUTMONDO_TOKEN;
const USER_ID = process.env.FUTMONDO_USER_ID;
const CHAMPIONSHIP_ID = process.env.FUTMONDO_CHAMPIONSHIP_ID;
const USERTEAM_ID = process.env.FUTMONDO_USERTEAM_ID;

const DEFAULT_HEADERS = {
  'Accept': '*/*',
  'Accept-Language': 'es-ES,es;q=0.9',
  'Content-Type': 'application/json; charset=utf-8',
  'Origin': 'https://app.futmondo.com',
  'Referer': 'https://app.futmondo.com/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'
};

// Helper: make authenticated Futmondo API request
async function futmondoRequest(endpoint, query = {}) {
  const body = {
    header: { token: TOKEN, userid: USER_ID },
    query,
    answer: {}
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error(`Futmondo API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data?.answer ?? data;
}

const LEAGUES_CONFIG = {
  '2a': {
    id: '2a',
    name: 'La segunda también vale',
    division: '2ª División',
    championshipId: process.env.FUTMONDO_2A_CHAMPIONSHIP_ID || '6a71d880f996a839bdb18bb1',
    userteamId: process.env.FUTMONDO_2A_USERTEAM_ID || '6a71d8813c7e1c3cdc724971',
    initialBudget: 20000000,
    pointBonus: 10000
  },
  '1a': {
    id: '1a',
    name: 'MexiCan',
    division: '1ª División',
    championshipId: process.env.FUTMONDO_1A_CHAMPIONSHIP_ID || '67321fc2f1504c7a1b31b968',
    userteamId: process.env.FUTMONDO_1A_USERTEAM_ID || '67321fc2344b5c3e5d0bba90',
    initialBudget: 300000000,
    pointBonus: 100000
  }
};

// Endpoint defaults: query params override the .env values when provided
function baseQuery(req) {
  const championshipId = req.query.championshipId || CHAMPIONSHIP_ID;
  let userteamId = req.query.userteamId;
  if (!userteamId) {
    if (championshipId === LEAGUES_CONFIG['1a'].championshipId) {
      userteamId = LEAGUES_CONFIG['1a'].userteamId;
    } else if (championshipId === LEAGUES_CONFIG['2a'].championshipId) {
      userteamId = LEAGUES_CONFIG['2a'].userteamId;
    } else {
      userteamId = USERTEAM_ID;
    }
  }
  return { championshipId, userteamId };
}

// Serve static frontend UI (valores iniciales y React dist)
app.use(express.static(path.join(__dirname, 'public')));


const distLocalPath = path.join(__dirname, 'dist');
const distParentPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distLocalPath)) {
  app.use(express.static(distLocalPath));
} else if (fs.existsSync(distParentPath)) {
  app.use(express.static(distParentPath));
}


// GET /api/initial-players - Devuelve las plantillas iniciales, ordenación por club de LaLiga y valores guardados
app.get('/api/initial-players', (req, res) => {
  try {
    const rostersPath = path.join(__dirname, 'league_initial_rosters.json');
    const valuesPath = path.join(__dirname, 'initial_player_values.json');
    const clubPath = path.join(__dirname, 'by_laliga_club.json');

    const rosters = fs.existsSync(rostersPath) ? JSON.parse(fs.readFileSync(rostersPath, 'utf8')) : {};
    const savedValues = fs.existsSync(valuesPath) ? JSON.parse(fs.readFileSync(valuesPath, 'utf8')) : {};
    const byClub = fs.existsSync(clubPath) ? JSON.parse(fs.readFileSync(clubPath, 'utf8')) : {};

    res.json({ ok: true, rosters, byClub, savedValues });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/save-initial-values - Guarda los valores iniciales e integra con el motor de cálculo
app.post('/api/save-initial-values', (req, res) => {
  try {
    const { playerValues } = req.body;
    if (!playerValues || typeof playerValues !== 'object') {
      return res.status(400).json({ ok: false, error: 'Datos no válidos' });
    }

    const valuesPath = path.join(__dirname, 'initial_player_values.json');
    fs.writeFileSync(valuesPath, JSON.stringify(playerValues, null, 2), 'utf8');

    // Recalcular métricas de ligas
    const rostersPath = path.join(__dirname, 'league_initial_rosters.json');
    const rosters = fs.existsSync(rostersPath) ? JSON.parse(fs.readFileSync(rostersPath, 'utf8')) : {};

    const managerStats = {};
    for (const [managerName, data] of Object.entries(rosters)) {
      const allPlayers = [...(data.retained || []), ...(data.sold || [])];
      let initialSquadVal = 0;
      let filledCount = 0;

      allPlayers.forEach(p => {
        const val = parseInt(playerValues[p.name] || 0, 10);
        if (val > 0) {
          initialSquadVal += val;
          filledCount++;
        }
      });

      const managerStartingCash = 300000000 - initialSquadVal;
      managerStats[managerName] = {
        totalPlayers: allPlayers.length,
        filledPlayers: filledCount,
        initialSquadVal,
        startingCash: managerStartingCash
      };
    }

    fs.writeFileSync(path.join(__dirname, 'calculated_initial_budgets.json'), JSON.stringify(managerStats, null, 2), 'utf8');

    for (const [mName, stats] of Object.entries(managerStats)) {
      const matchedKey = Object.keys(exactStatsObj).find(k => k.toLowerCase().includes(mName.toLowerCase()) || mName.toLowerCase().includes(k.toLowerCase()));
      if (matchedKey && exactStatsObj[matchedKey]) {
        exactStatsObj[matchedKey].exactInitialSquadDay1 = stats.initialSquadVal;
        exactStatsObj[matchedKey].exactStartingCash = stats.startingCash;
        exactStatsObj[matchedKey].exactCalculatedCash = stats.startingCash - (exactStatsObj[matchedKey].totalBuys || 0) + (exactStatsObj[matchedKey].totalSales || 0);
      }
    }


    console.log('✅ Valores iniciales guardados y presupuestos recalculados.');

    res.json({ ok: true, managerStats });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/leagues-config - Devuelve las 2 ligas del usuario con su presupuesto y primas
app.get('/api/leagues-config', (req, res) => {
  res.json({ ok: true, leagues: LEAGUES_CONFIG });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    token: TOKEN ? TOKEN.substring(0, 8) + '...' : 'NOT SET',
    userId: USER_ID,
    leagues: LEAGUES_CONFIG
  });
});

// GET /api/market - Mercado global de tu liga (precios, subidas y bajadas)
app.get('/api/market', async (req, res) => {
  try {
    const q = baseQuery(req);
    q.type = 'market';
    const data = await futmondoRequest('/1/market/players', q);
    res.json({ ok: true, data });
  } catch (err) {
    console.error('[/api/market]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/roster - Tu plantilla completa con valores y variaciones
app.get('/api/roster', async (req, res) => {
  try {
    const data = await futmondoRequest('/1/userteam/roster', baseQuery(req));
    res.json({ ok: true, data });
  } catch (err) {
    console.error('[/api/roster]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/lineup - Alineación de la jornada (titulares + banquillo)
app.get('/api/lineup', async (req, res) => {
  try {
    const data = await futmondoRequest('/1/userteam/lineup', baseQuery(req));
    res.json({ ok: true, data });
  } catch (err) {
    console.error('[/api/lineup]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/leagues - Lista las competiciones disponibles
app.get('/api/leagues', async (req, res) => {
  try {
    const data = await futmondoRequest('/2/league/list', '');
    res.json({ ok: true, data });
  } catch (err) {
    console.error('[/api/leagues]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/league-teams - Lista todos los rivales y equipos de tu liga
app.get('/api/league-teams', async (req, res) => {
  try {
    const q = baseQuery(req);
    const data = await futmondoRequest('/1/ranking/general', { championshipId: q.championshipId });
    const teams = data?.ranking || [];
    res.json({ ok: true, teams });
  } catch (err) {
    console.error('[/api/league-teams]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/championship-news - Muro de transferencias y movimientos de la liga
app.get('/api/championship-news', async (req, res) => {
  try {
    const q = baseQuery(req);
    const data = await futmondoRequest('/1/news/list', { championshipId: q.championshipId, page: 0 });
    res.json({ ok: true, data });
  } catch (err) {
    console.error('[/api/championship-news]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/rivals-finances
// Calcula el saldo real de cada rival leyendo su plantilla completa via /1/userteam/roster.
// Fórmula: Saldo = Presupuesto Inicial - Suma(buyPrice) + (Puntos * Primas/Punto) - Gasto en Cláusulas
app.get('/api/rivals-finances', async (req, res) => {
  try {
    const exactStats = exactStatsObj;

    const championshipId = req.query.championshipId || CHAMPIONSHIP_ID;
    const myUserteamId   = req.query.userteamId    || USERTEAM_ID;
    const initialBudget  = parseInt(req.query.budget || '20000000', 10);
    const pointBonus     = parseInt(req.query.pointBonus || (initialBudget > 50000000 ? '100000' : '10000'), 10);

    // 1) Obtener lista de todos los equipos de la liga con su puntuación
    const rankingData = await futmondoRequest('/1/ranking/general', { championshipId });
    const teams = rankingData?.ranking || [];

    if (teams.length === 0) {
      return res.status(404).json({ ok: false, error: 'No se encontraron equipos en la liga' });
    }

    // 1) Obtener total de compras y ventas de la Sala de Prensa para toda la liga
    const pressroomStats = await getPressroomStats(championshipId);

    // 2) Obtener valor oficial de plantilla de cada equipo desde /1/championship/teams
    // This endpoint also has the CORRECT team IDs - use it to fix mismatches from ranking
    let officialTeamValueMap = {};
    let champTeamsList = [];
    try {
      const champTeams = await futmondoRequest('/1/championship/teams', { championshipId });
      if (Array.isArray(champTeams)) {
        champTeamsList = champTeams;
        champTeams.forEach(ct => {
          const tId = ct.id || ct.teamid;
          if (tId && typeof ct.teamValue === 'number') {
            officialTeamValueMap[tId] = ct.teamValue;
          }
        });
      }
    } catch (e) {
      console.error('Error al obtener valores oficiales de plantilla:', e.message);
    }

    // Enrich ranking teams with correct IDs from /1/championship/teams when they differ
    const normStr2 = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    const enrichedTeams = teams.map(rankTeam => {
      const matchedChampTeam = champTeamsList.find(ct => {
        const ctName = normStr2(ct.teamname || ct.name || '');
        const rankName = normStr2(rankTeam.name || '');
        return ct.id === rankTeam.id || ct.teamid === rankTeam.id || 
               ctName === rankName || ctName.includes(rankName) || rankName.includes(ctName);
      });
      if (matchedChampTeam && matchedChampTeam.id !== rankTeam.id) {
        console.log('[ID Fix] ' + rankTeam.name + ': ranking=' + rankTeam.id + ' -> corrected=' + matchedChampTeam.id);
        return { ...rankTeam, id: matchedChampTeam.id };
      }
      return rankTeam;
    });

    const is2ADiv = championshipId === LEAGUES_CONFIG['2a'].championshipId;
    const ROLE_MAP = { portero: 'POR', defensa: 'DEF', centrocampista: 'MED', delantero: 'DEL' };
    const normStr = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

    // 3) Para cada equipo, realizar la auditoría financiera desglosada con todas las métricas requeridas
    const results = await Promise.all(enrichedTeams.map(async (team) => {
      try {
        const rosterAnswer = await futmondoRequest('/1/userteam/roster', {
          championshipId,
          userteamId: team.id
        });

        const roster = Array.isArray(rosterAnswer)
          ? rosterAnswer
          : Object.values(rosterAnswer).filter(v => v && typeof v === 'object' && v.id);

        const calculatedRosterValue = roster.reduce((sum, p) => sum + (p.value || 0), 0);
        const squadValue = officialTeamValueMap[team.id] || calculatedRosterValue;

        const isCarlos = team.id === '6a71d8813c7e1c3cdc724971' || team.name?.includes('Carlos Romero');

        // Puntos totales del rival y dinero acumulado por puntos
        const totalPoints  = team.points || 0;
        const pointsIncome = totalPoints * pointBonus;

        // Dinero gastado en subir cláusulas (se calcula el rps real de cada jugador en la plantilla vía /1/player/summary)
        const rpsDetails = await Promise.all(roster.map(async (p) => {
          const pId = (typeof p._player === 'object' ? p._player?._id : p._player) || p._id || p.id;
          if (!pId || typeof pId !== 'string') return { pName: p.name, rps: 0 };
          try {
            const pSummary = await futmondoRequest('/1/player/summary', { championshipId, playerId: pId });
            const rps = pSummary?.championship?.clause?.rps || pSummary?.clause?.rps || 0;
            return { pName: p.name, rps };
          } catch (e) {
            return { pName: p.name, rps: 0 };
          }
        }));
        const autoRpsSpent = rpsDetails.reduce((a, b) => a + (b.rps || 0), 0);
        const trackerSpent = getRivalClauseSpent(championshipId, team.id);
        const clauseSpent = Math.max(autoRpsSpent, trackerSpent);

        let cashBalance = 0;
        let totalSpent = 0;
        let initialSquadValue = 0;
        let teamBuys = 0;
        let teamSales = 0;
        let tradingProfit = 0;
        let completedTrades = [];
        let clausesReceived = pressroomStats.clausesReceivedByTeam?.[team.id] || 0;

        // 1. Obtener la plantilla inicial auditada Día 1 (02/08)
        const rostersPath = path.join(__dirname, 'league_initial_rosters.json');
        const valuesPath = path.join(__dirname, 'initial_player_values.json');
        const rostersData = fs.existsSync(rostersPath) ? JSON.parse(fs.readFileSync(rostersPath, 'utf8')) : {};
        const savedVals = fs.existsSync(valuesPath) ? JSON.parse(fs.readFileSync(valuesPath, 'utf8')) : {};

        const getInitialVal = (name) => {
          if (!name) return null;
          const norm = name.trim().toLowerCase();
          const foundKey = Object.keys(savedVals).find(k => k.trim().toLowerCase() === norm);
          return foundKey ? parseInt(savedVals[foundKey] || 0, 10) : null;
        };

        const paidLockerKey = Object.keys(pressroomStats.lockerPaidByName || {}).find(k => team.name.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(team.name.toLowerCase()));
        const recLockerKey = Object.keys(pressroomStats.lockerReceivedByName || {}).find(k => team.name.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(team.name.toLowerCase()));
        const lockerPaid = paidLockerKey ? pressroomStats.lockerPaidByName[paidLockerKey] : 0;
        const lockerReceived = recLockerKey ? pressroomStats.lockerReceivedByName[recLockerKey] : 0;

        let retainedNames = [];
        let initialData = { retained: [], sold: [] };

        if (is2ADiv) {
          // 2ª División: Sin plantilla inicial, 20M€ presupuesto base
          initialSquadValue = 0;
          teamBuys  = roster.reduce((sum, p) => sum + (p.buyPrice || p.value || 0), 0);
          teamSales = pressroomStats.salesByTeam?.[team.id] || 0;
          completedTrades = pressroomStats.tradesByTeam?.[team.id] || [];
          tradingProfit = completedTrades.reduce((sum, tr) => sum + (tr.profitLoss || 0), 0);

          cashBalance = 20000000 - teamBuys + teamSales + pointsIncome - clauseSpent + lockerReceived;
          totalSpent = teamBuys;
        } else {
          // 1ª División: Con plantilla inicial asignada (300M€ presupuesto base)
          const teamNorm = normStr(team.name);
          const matchedKey = Object.keys(rostersData).find(k => {
            const kNorm = normStr(k);
            return kNorm.includes(teamNorm) || teamNorm.includes(kNorm);
          });
          initialData = matchedKey ? rostersData[matchedKey] : { retained: [], sold: [] };
          const allInitialPlayers = [...(initialData.retained || []), ...(initialData.sold || [])];

          const matchedStatsKey = Object.keys(exactStatsObj).find(k => {
            const kNorm = normStr(k);
            return kNorm.includes(teamNorm) || teamNorm.includes(kNorm);
          });
          const exactStat = matchedStatsKey ? exactStatsObj[matchedStatsKey] : null;

          if (isCarlos) {
            initialSquadValue = 100472941; // Cifra oficial exacta según ajuste de administración en Futmondo (-100.472.941 €)
          } else if (exactStat && exactStat.exactInitialSquadDay1) {
            initialSquadValue = exactStat.exactInitialSquadDay1;
          } else {
            initialSquadValue = 0;
            allInitialPlayers.forEach(p => {
              initialSquadValue += (getInitialVal(p.name) || 0);
            });
          }

          retainedNames = (initialData.retained || []).map(r => normStr(r.name));

          // --- Build a unified buy-price map (pId -> buyPrice) from ALL sources ---
          // Source 1: current roster buyPrice (definitive for players still held)
          const currentRosterPIds = new Set(roster.map(p => p.id));
          const unifiedBuyMap = {}; // pId -> { price, playerName }
          roster.forEach(p => { if (p.buyPrice) unifiedBuyMap[p.id] = { price: p.buyPrice, playerName: p.name }; });

          // Source 2: pressroom buys for players no longer in the roster (between-manager moves)
          const pressroomBuysList = pressroomStats.buysListByTeam?.[team.id] || [];
          pressroomBuysList.forEach(b => {
            if (b.pId && !currentRosterPIds.has(b.pId)) {
              unifiedBuyMap[b.pId] = { price: b.price, playerName: b.playerName };
            }
          });

          // Source 3: initial squad values (for players from the day-1 squad, bought via auction)
          // These are in initial_player_values.json and their "buy price" = their day-1 valuation
          const unifiedBuyMapByName = {}; // normalized player name -> { price }
          allInitialPlayers.forEach(p => {
            const initVal = getInitialVal(p.name);
            if (initVal) {
              unifiedBuyMapByName[normStr(p.name)] = { price: initVal, playerName: p.name, isInitial: true };
            }
          });

          const retainedSet = new Set((initialData.retained || []).map(r => normStr(r.name)));

          let currentRosterBuys = roster
            .filter(p => !retainedSet.has(normStr(p.name)))
            .reduce((sum, p) => sum + (p.buyPrice || 0), 0);
          let soldPlayersBuys = pressroomBuysList
            .filter(b => b.pId && !currentRosterPIds.has(b.pId))
            .reduce((sum, b) => sum + (b.price || 0), 0);
          teamBuys = currentRosterBuys + soldPlayersBuys;

          const pressroomSalesList2 = pressroomStats.salesListByTeam?.[team.id] || [];
          const pressroomSalesTotal = pressroomStats.salesByTeam?.[team.id] || 0;
          let soldInitialCashReceived = 0;
          (initialData.sold || []).forEach(s => { soldInitialCashReceived += (s.salePrice || 0); });
          teamSales = Math.max(pressroomSalesTotal, soldInitialCashReceived);
          totalSpent = teamBuys;

          // --- Compute tradingProfit using unified buy map for ALL sales ---
          pressroomSalesList2.forEach(s => {
            // Try pId lookup first, then name-based lookup from initial squad
            let buyInfo = s.pId ? unifiedBuyMap[s.pId] : null;
            if (!buyInfo) buyInfo = unifiedBuyMapByName[normStr(s.playerName)] || null;
            if (buyInfo) {
              completedTrades.push({
                pId: s.pId,
                pName: s.playerName,
                buyPrice: buyInfo.price,
                sellPrice: s.price,
                profitLoss: s.price - buyInfo.price,
                sellDate: s.date,
                buyerName: s.buyerName || 'Mercado',
                source: buyInfo.isInitial ? 'Plantilla Inicial' : 'Mercado/Traspaso'
              });
            }
          });
          tradingProfit = completedTrades.reduce((sum, tr) => sum + tr.profitLoss, 0);

          const managerStartingCash = 300000000 - initialSquadValue;
          cashBalance = managerStartingCash - teamBuys + teamSales + pointsIncome - clauseSpent + lockerReceived;

        }

        const isUser = team.id === myUserteamId;

        const players = roster.map(p => ({
          id: p.id,
          name: p.name,
          position: ROLE_MAP[p.role] || p.role || '?',
          club: p.team,
          currentValue: p.value || 0,
          buyPrice: p.buyPrice || p.value || 0,
          profitLoss: (p.value || 0) - (p.buyPrice || p.value || 0),
          clause: p.clause ? p.clause.price : null
        }));

        const pressroomBuysListFinal = pressroomStats.buysListByTeam?.[team.id] || [];
        const rosterBuysList = roster
          .filter(p => (p.buyPrice || 0) > 0)
          .map(p => ({ pId: p.id, playerName: p.name, price: p.buyPrice || 0, date: '', sellerName: 'Mercado / Subasta' }));

        // Combined: roster entries take precedence (have the real buyPrice); pressroom adds sold players
        const combinedBuysMap = new Map();
        pressroomBuysListFinal.forEach(b => combinedBuysMap.set(b.pId || normStr(b.playerName), b));
        rosterBuysList.forEach(b => combinedBuysMap.set(b.pId || normStr(b.playerName), b)); // roster overwrites
        const allBuysList = Array.from(combinedBuysMap.values()).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        const pressroomSalesList = pressroomStats.salesListByTeam?.[team.id] || [];
        const rawSoldInitial = pressroomStats.soldInitialByTeam?.[team.id] || [];

        const recLockerItemKey = Object.keys(pressroomStats.lockerReceivedItemsByName || {}).find(k => 
          team.name.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(team.name.toLowerCase())
        );
        const clausesReceivedDetails = recLockerItemKey ? (pressroomStats.lockerReceivedItemsByName[recLockerItemKey] || []) : [];

        const paidLockerItemsKey = Object.keys(pressroomStats.lockerPaidItemsByName || {}).find(k => 
          team.name.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(team.name.toLowerCase())
        );
        const pressroomPaidDetails = paidLockerItemsKey ? (pressroomStats.lockerPaidItemsByName[paidLockerItemsKey] || []) : [];
        const ownRaisesDetails = rpsDetails
          .filter(r => r.rps > 0)
          .map(r => ({ playerName: r.pName, price: r.rps, sellerName: 'Vestuario Propio', type: 'Subida Propia' }));

        // Only include own RPS raises in clausesPaidDetails so modal table matches clauseSpent amount
        const clausesPaidDetails = ownRaisesDetails;

        return {
          id: team.id,
          name: team.name,
          isUser,
          totalPlayers: roster.length,
          totalSpent,
          squadValue,
          initialSquadValue,
          initialRosterDetails: {
            retained: initialData.retained || [],
            sold: initialData.sold || []
          },
          totalBuys: teamBuys,
          buysList: allBuysList,
          totalSales: teamSales,
          salesList: pressroomSalesList,
          tradingProfit,
          trades: completedTrades,
          soldInitial: rawSoldInitial.map(item => {
            const pName = item._player?.name || 'Jugador Inicial';
            const salePrice = item.price || 0;
            const initVal = getInitialVal(pName);
            return {
              pName,
              salePrice,
              saleDate: item.created ? item.created.substring(0, 10) : '',
              initialValue: initVal,
              profit: initVal ? (salePrice - initVal) : null
            };
          }),
          clausesReceived,
          clausesReceivedDetails,
          clauseSpent,
          clausesPaidDetails: ownRaisesDetails,
          stolenClausesDetails: pressroomPaidDetails,
          totalStolenClauses: pressroomPaidDetails.reduce((sum, item) => sum + (item.price || 0), 0),
          cashBalance,
          maxBid: Math.max(0, cashBalance + Math.floor(squadValue * 0.2)),
          health: cashBalance < 0 ? 'danger' : cashBalance < 1500000 ? 'tight' : 'healthy',
          players
        };
      } catch (e) {
        console.error(`Error procesando finanzas para ${team.name}:`, e.message);
        return {
          id: team.id,
          name: team.name,
          isUser: team.id === myUserteamId,
          totalPlayers: 0,
          totalSpent: 0,
          squadValue: 0,
          totalPoints: team.points || 0,
          pointsIncome: (team.points || 0) * pointBonus,
          clauseSpent: 0,
          cashBalance: 0,
          maxBid: 0,
          health: 'healthy',
          players: [],
          error: e.message
        };
      }
    }));

    // Registrar instantánea en el historial de cláusulas
    recordRosterSnapshot(championshipId, results);

    // Ordenar: primero el usuario, luego por mayor saldo
    results.sort((a, b) => {
      if (a.isUser) return -1;
      if (b.isUser) return 1;
      return b.cashBalance - a.cashBalance;
    });

    res.json({ ok: true, championship: championshipId, initialBudget, pointBonus, rivals: results });
  } catch (err) {
    console.error('[/api/rivals-finances]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Endpoint para el seguimiento completo de subida de cláusulas
app.get('/api/clause-raises', async (req, res) => {
  try {
    const championshipId = req.query.championshipId || process.env.FUTMONDO_1A_CHAMPIONSHIP_ID || '67321fc2f1504c7a1b31b968';
    
    const rankingData = await futmondoRequest('/1/ranking/general', { championshipId });
    const teams = rankingData?.ranking || [];

    const raisedPlayersList = [];
    const managerSummaries = [];
    let totalLeagueClauseSpent = 0;

    let initialPlayerValues = {};
    const initValsPath = path.join(__dirname, 'initial_player_values.json');
    if (fs.existsSync(initValsPath)) {
      try {
        initialPlayerValues = JSON.parse(fs.readFileSync(initValsPath, 'utf8'));
      } catch (e) {
        console.error('Error cargando initial_player_values.json:', e.message);
      }
    }

    // Cargar subidas de cláusula manuales/personalizadas por el usuario
    let customClauseRaises = {};
    const customPath = path.join(__dirname, 'data', 'custom_clause_raises.json');
    if (fs.existsSync(customPath)) {
      try {
        customClauseRaises = JSON.parse(fs.readFileSync(customPath, 'utf8'));
      } catch (e) {
        console.error('Error cargando custom_clause_raises.json:', e.message);
      }
    }

// Tabla oficial de Cláusulas Baratas de Futmondo
const BARATAS_TABLE = [
  { val: 0, clause: 2100000 },
  { val: 1000000, clause: 2100000 },
  { val: 2000000, clause: 3614213 },
  { val: 3000000, clause: 5032050 },
  { val: 4000000, clause: 6400000 },
  { val: 5000000, clause: 7736067 },
  { val: 6000000, clause: 9049489 },
  { val: 7000000, clause: 10345751 },
  { val: 8000000, clause: 11628427 },
  { val: 9000000, clause: 12900000 },
  { val: 10000000, clause: 14162277 },
  { val: 11000000, clause: 15416624 },
  { val: 12000000, clause: 16664101 },
  { val: 13000000, clause: 17905551 },
  { val: 14000000, clause: 19141657 },
  { val: 15000000, clause: 20372983 },
  { val: 16000000, clause: 21600000 },
  { val: 17000000, clause: 22823105 },
  { val: 18000000, clause: 24042640 },
  { val: 19000000, clause: 25258898 },
  { val: 20000000, clause: 26472135 },
  { val: 21000000, clause: 27682575 },
  { val: 22000000, clause: 28890415 }
];

function getFutmondoBaseClause(playerValue) {
  if (!playerValue || playerValue <= 1000000) return 2100000;
  for (let i = 0; i < BARATAS_TABLE.length - 1; i++) {
    const p1 = BARATAS_TABLE[i];
    const p2 = BARATAS_TABLE[i + 1];
    if (playerValue >= p1.val && playerValue <= p2.val) {
      const ratio = (playerValue - p1.val) / (p2.val - p1.val);
      return Math.round(p1.clause + ratio * (p2.clause - p1.clause));
    }
  }
  const last = BARATAS_TABLE[BARATAS_TABLE.length - 1];
  const secondLast = BARATAS_TABLE[BARATAS_TABLE.length - 2];
  const slope = (last.clause - secondLast.clause) / (last.val - secondLast.val);
  return Math.round(last.clause + (playerValue - last.val) * slope);
}

    for (const team of teams) {
      const rosterAnswer = await futmondoRequest('/2/userteam/roster', { championshipId, userteamId: team.id });
      const rosterData = rosterAnswer?.answer || rosterAnswer;
      const roster = Array.isArray(rosterData)
        ? rosterData
        : (rosterData.players || Object.values(rosterData).filter(v => v && typeof v === 'object' && v.id));

      let managerClauseSpent = 0;
      const teamRaisedPlayers = [];
      const teamCustom = customClauseRaises[team.id] || [];

      for (const p of roster) {
        let currentClause = p.clause?.price || (typeof p.clause === 'number' ? p.clause : 0);
        if (!currentClause) continue;

        const buyPrice = p.buyPrice || 0;
        const initialVal = initialPlayerValues[p.name] || 0;
        let rpsSpent = 0;

        // Consultar el endpoint oficial /1/player/summary para obtener la cláusula real y el gasto rps
        try {
          const summaryRes = await futmondoRequest('/1/player/summary', { playerId: p.id, championshipId });
          const champClause = summaryRes?.championship?.clause;
          if (champClause?.price) {
            currentClause = champClause.price;
            rpsSpent = champClause.rps || 0;
          }
        } catch (e) {}

        // Comprobar si hay una subida manual o verificada registrada para este jugador
        const customItem = teamCustom.find(c => c.playerId === p.id || c.playerName === p.name);

        let cashSpent = 0;
        let deltaClause = 0;
        let baseClause = 0;

        if (customItem) {
          currentClause = customItem.realClause || currentClause;
          cashSpent = customItem.cashSpent || 0;
          deltaClause = cashSpent * 2; // Regla Futmondo: +2€ de cláusula por cada 1€ de caja gastado
          baseClause = currentClause - deltaClause;
        } else if (rpsSpent > 0) {
          cashSpent = rpsSpent;
          deltaClause = cashSpent * 2;
          baseClause = currentClause - deltaClause;
        } else {
          // Heurística de respaldo: calcular sobre mayor entre compra e inicial
          const valuationBasis = Math.max(buyPrice, initialVal);
          const estBase = getFutmondoBaseClause(valuationBasis > 0 ? valuationBasis : (p.value || 0));
          const estDelta = currentClause - estBase;
          // Solo si hay un incremento significativo (>= 500.000€ gastados de caja = >= 1.000.000€ de cláusula)
          if (estDelta >= 1000000) {
            cashSpent = Math.round(estDelta / 2000000) * 1000000; // Redondear a millones exactos gastados
            if (cashSpent < 1000000) cashSpent = Math.round(estDelta / 2);
            deltaClause = cashSpent * 2;
            baseClause = currentClause - deltaClause;
          }
        }

        const isRealRaise = cashSpent > 0;

        if (isRealRaise) {
          managerClauseSpent += cashSpent;

          const playerItem = {
            id: p.id,
            name: p.name,
            position: p.role,
            club: p.team,
            managerId: team.id,
            managerName: team.name,
            isUser: team.id === req.query.userteamId || team.name?.includes('Carlos Romero'),
            currentClause,
            suggestedClause: p.clause?.suggestedClause || 0,
            buyPrice,
            baseClause,
            deltaClause,
            cashSpent,
            clauseDate: customItem?.date || p.clause?.date || new Date().toISOString(),
            isCustom: !!customItem
          };

          teamRaisedPlayers.push(playerItem);
          raisedPlayersList.push(playerItem);
        }
      }

      totalLeagueClauseSpent += managerClauseSpent;
      managerSummaries.push({
        teamId: team.id,
        name: team.name,
        isUser: team.id === req.query.userteamId || team.name?.includes('Carlos Romero'),
        totalClauseSpent: managerClauseSpent,
        raisedCount: teamRaisedPlayers.length,
        raisedPlayers: teamRaisedPlayers
      });
    }

    raisedPlayersList.sort((a, b) => b.cashSpent - a.cashSpent);
    managerSummaries.sort((a, b) => b.totalClauseSpent - a.totalClauseSpent);

    res.json({
      ok: true,
      championshipId,
      totalLeagueClauseSpent,
      totalRaisedPlayers: raisedPlayersList.length,
      topManager: managerSummaries[0] || null,
      topPlayer: raisedPlayersList[0] || null,
      managers: managerSummaries,
      players: raisedPlayersList
    });
  } catch (err) {
    console.error('[/api/clause-raises]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Registrar o actualizar una subida de cláusula manual introducida por el usuario
app.post('/api/save-clause-raise', (req, res) => {
  try {
    const { teamId, playerId, playerName, realClause, cashSpent, notes } = req.body;
    if (!teamId || !playerName) {
      return res.status(400).json({ ok: false, error: 'Faltan parámetros requeridos (teamId, playerName)' });
    }

    const customPath = path.join(__dirname, 'data', 'custom_clause_raises.json');
    let customData = {};
    if (fs.existsSync(customPath)) {
      try {
        customData = JSON.parse(fs.readFileSync(customPath, 'utf8'));
      } catch (e) {}
    }

    if (!customData[teamId]) customData[teamId] = [];

    const existingIdx = customData[teamId].findIndex(c => (playerId && c.playerId === playerId) || c.playerName === playerName);
    const item = {
      playerId: playerId || '',
      playerName,
      realClause: Number(realClause) || 0,
      cashSpent: Number(cashSpent) || 0,
      notes: notes || '',
      date: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      customData[teamId][existingIdx] = item;
    } else {
      customData[teamId].push(item);
    }

    fs.writeFileSync(customPath, JSON.stringify(customData, null, 2), 'utf8');
    res.json({ ok: true, message: `Subida guardada correctamente para ${playerName}`, item });
  } catch (err) {
    console.error('[/api/save-clause-raise]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/clause-unlocks - Devuelve información en vivo del estado de candados (liberados vs bloqueados con cuenta atrás)
app.get('/api/clause-unlocks', async (req, res) => {
  try {
    const championshipId = req.query.championshipId || process.env.FUTMONDO_1A_CHAMPIONSHIP_ID || '67321fc2f1504c7a1b31b968';
    const myUserteamId = req.query.userteamId || process.env.FUTMONDO_1A_USERTEAM_ID || '67321fc2344b5c3e5d0bba90';
    
    const rankingData = await futmondoRequest('/1/ranking/general', { championshipId });
    const teams = rankingData?.ranking || [];

    const ROLE_MAP = { portero: 'POR', defensa: 'DEF', centrocampista: 'MED', delantero: 'DEL' };
    const now = new Date();
    const allPlayers = [];

    // Cargar subidas de cláusula manuales/verificadas introducidas por los mánagers
    const customPath = path.join(__dirname, 'data', 'custom_clause_raises.json');
    let customClauseRaises = {};
    if (fs.existsSync(customPath)) {
      try {
        customClauseRaises = JSON.parse(fs.readFileSync(customPath, 'utf8'));
      } catch (e) {}
    }

    await Promise.all(teams.map(async (team) => {
      try {
        const rosterAnswer = await futmondoRequest('/1/userteam/roster', { championshipId, userteamId: team.id });
        const rosterData = rosterAnswer?.answer || rosterAnswer;
        const roster = Array.isArray(rosterData)
          ? rosterData
          : (rosterData.players || Object.values(rosterData).filter(v => v && typeof v === 'object' && v.id));

        const teamCustom = customClauseRaises[team.id] || [];

        await Promise.all(roster.map(async (p) => {
          const val = p.value || 0;
          let clausePrice = p.clause?.price || (typeof p.clause === 'number' ? p.clause : 0);
          let clauseDateStr = p.clause?.date || null;
          let rpsSpent = 0;

          // Consultar el endpoint oficial /1/player/summary para obtener la cláusula real actualizada y el gasto RPS en Futmondo
          try {
            const summaryRes = await futmondoRequest('/1/player/summary', { playerId: p.id || p._id, championshipId });
            const champClause = summaryRes?.championship?.clause;
            if (champClause?.price) {
              clausePrice = champClause.price;
            }
            if (champClause?.date) {
              clauseDateStr = champClause.date;
            }
            if (champClause?.rps) {
              rpsSpent = champClause.rps;
            }
          } catch (e) {}

          // Comprobar si hay un blindaje/subida manual registrada para este jugador
          const customItem = teamCustom.find(c => (c.playerId && c.playerId === p.id) || (c.playerName && c.playerName === p.name));
          let isCustom = false;
          let cashSpentOnRaise = rpsSpent;

          if (customItem) {
            if (customItem.realClause > 0) clausePrice = customItem.realClause;
            if (customItem.date) clauseDateStr = customItem.date;
            if (customItem.cashSpent) cashSpentOnRaise = customItem.cashSpent;
            isCustom = true;
          }

          const cDate = clauseDateStr ? new Date(clauseDateStr) : null;
          const isUnlocked = cDate ? cDate <= now : true;
          const percentDiff = val > 0 ? (((clausePrice - val) / val) * 100) : 0;
          const isUser = team.id === myUserteamId || team.name?.includes('Carlos Romero');

          allPlayers.push({
            id: p.id || p._id,
            name: p.name,
            role: p.role,
            position: ROLE_MAP[p.role] || p.role || '?',
            club: p.team || 'LaLiga',
            photo: p.photo || '',
            value: val,
            buyPrice: p.buyPrice || 0,
            clausePrice,
            clauseDate: clauseDateStr,
            suggestedClause: p.clause?.suggestedClause || 0,
            isUnlocked,
            percentDiff: Number(percentDiff.toFixed(2)),
            managerId: team.id,
            managerName: team.name,
            isUser,
            isCustom,
            isRaisedInFutmondo: rpsSpent > 0,
            cashSpentOnRaise
          });
        }));
      } catch (e) {
        console.error(`[clause-unlocks] Error obteniendo plantilla para ${team.name}:`, e.message);
      }
    }));

    const unlockedPlayers = allPlayers.filter(p => p.isUnlocked);
    const lockedPlayers = allPlayers.filter(p => !p.isUnlocked);

    lockedPlayers.sort((a, b) => new Date(a.clauseDate) - new Date(b.clauseDate));
    unlockedPlayers.sort((a, b) => a.percentDiff - b.percentDiff);

    const nextToUnlock = lockedPlayers[0] || null;
    const sortedByBargain = allPlayers.filter(p => p.clausePrice > 0).sort((a, b) => a.percentDiff - b.percentDiff);
    const bestBargain = sortedByBargain[0] || null;

    res.json({
      ok: true,
      championshipId,
      serverTime: now.toISOString(),
      totalPlayers: allPlayers.length,
      totalUnlocked: unlockedPlayers.length,
      totalLocked: lockedPlayers.length,
      nextToUnlock,
      bestBargain,
      players: allPlayers
    });
  } catch (err) {
    console.error('[/api/clause-unlocks]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Fallback SPA routing for React
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
    return next();
  }
  const indexFile = fs.existsSync(path.join(__dirname, 'dist', 'index.html'))
    ? path.join(__dirname, 'dist', 'index.html')
    : fs.existsSync(path.join(__dirname, '..', 'dist', 'index.html'))
      ? path.join(__dirname, '..', 'dist', 'index.html')
      : null;
  if (indexFile) {
    res.sendFile(indexFile);
  } else {
    next();
  }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Futmondo Proxy Server corriendo en http://localhost:${PORT}`);
  console.log(`\nEndpoints disponibles:`);
  console.log(`  GET http://localhost:${PORT}/health`);
  console.log(`  GET http://localhost:${PORT}/api/leagues-config`);
  console.log(`  GET http://localhost:${PORT}/api/market`);
  console.log(`  GET http://localhost:${PORT}/api/roster`);
  console.log(`  GET http://localhost:${PORT}/api/rivals-finances`);
  console.log(`\n✅ Token cargado: ${TOKEN ? TOKEN.substring(0, 8) + '...' : '⚠️  NO CONFIGURADO'}`);
  console.log(`✅ Liga 2ª (La segunda también vale): ${LEAGUES_CONFIG['2a'].championshipId}`);
  console.log(`✅ Liga 1ª (MexiCan): ${LEAGUES_CONFIG['1a'].championshipId}\n`);

  // Ejecutar primer snapshot al arrancar el servidor
  setTimeout(runScheduledClauseSnapshots, 3000);
});

const cron = require('node-cron');

async function runScheduledClauseSnapshots() {
  console.log('\n[Cronjob Mercado Canaria] 📸 Ejecutando cuadre de mercado y monitoreo de cláusulas...');
  for (const leagueKey of Object.keys(LEAGUES_CONFIG)) {
    const league = LEAGUES_CONFIG[leagueKey];
    try {
      const fetchUrl = `http://localhost:${PORT}/api/rivals-finances?championshipId=${league.championshipId}&userteamId=${league.userteamId}&budget=${league.initialBudget}&pointBonus=${league.pointBonus}`;
      const res = await fetch(fetchUrl);
      const json = await res.json();
      if (json.ok) {
        console.log(`[Cronjob Mercado] ✅ Snapshot guardado para ${league.name} (${json.rivals?.length || 0} rivales)`);
      }
    } catch (e) {
      console.error(`[Cronjob Mercado] ⚠️ Error en ${league.name}:`, e.message);
    }
  }
}

// Programación según Mercado Futmondo: 06:00 y 16:15 Hora Canaria (Atlantic/Canary)
cron.schedule('0 6 * * *', () => {
  console.log('\n⏰ [06:00 Hora Canaria] 🌅 Ejecutando cuadre matutino del mercado Futmondo...');
  runScheduledClauseSnapshots();
}, { timezone: 'Atlantic/Canary' });

cron.schedule('15 16 * * *', () => {
  console.log('\n⏰ [16:15 Hora Canaria] ☀️ Ejecutando cuadre vespertino del mercado Futmondo...');
  runScheduledClauseSnapshots();
}, { timezone: 'Atlantic/Canary' });

function parseClauseText(text) {
  if (!text || !text.includes('como clausula de')) return null;
  const buyerMatch = text.match(/El equipo <strong>(.*?)<\/strong>/i);
  const priceMatch = text.match(/ha pagado <strong>([\d\.]+)<\/strong>/i);
  const sellerMatch = text.match(/propiedad de <strong>(.*?)<\/strong>/i);
  const playerMatch = text.match(/como clausula de <strong>(.*?)<\/strong>/i);

  if (buyerMatch && priceMatch && sellerMatch && playerMatch) {
    return {
      buyerName: buyerMatch[1].trim(),
      price: parseInt(priceMatch[1].replace(/\./g, ''), 10),
      sellerName: sellerMatch[1].trim(),
      playerName: playerMatch[1].trim()
    };
  }
  return null;
}

function getInitialVal(name) {
  if (!name) return 0;
  try {
    const valuesPath = path.join(__dirname, 'initial_player_values.json');
    if (!fs.existsSync(valuesPath)) return 0;
    const savedVals = JSON.parse(fs.readFileSync(valuesPath, 'utf8'));
    const norm = name.trim().toLowerCase();
    const foundKey = Object.keys(savedVals).find(k => k.trim().toLowerCase() === norm);
    return foundKey ? parseInt(savedVals[foundKey] || 0, 10) : 0;
  } catch (e) {
    return 0;
  }
}

// Obtener compras, ventas y beneficios reales por operaciones individuales de trading
async function getPressroomStats(championshipId) {
  let allNews = [];
  const archivePath = path.join(__dirname, `pressroom_archive_${championshipId}.json`);
  let archivedNews = [];
  if (fs.existsSync(archivePath)) {
    try {
      archivedNews = JSON.parse(fs.readFileSync(archivePath, 'utf8'));
    } catch(e) {}
  }

  let from = '';
  let hasMore = true;
  let pages = 0;

  while (hasMore && pages < 40) {
    pages++;
    try {
      const data = await futmondoRequest('/1/locker/pressroom', { championshipId, from });
      const news = data?.news || [];
      if (!Array.isArray(news) || news.length === 0) {
        hasMore = false;
      } else {
        allNews = allNews.concat(news);
        const last = news[news.length - 1];
        if (last && last._id && last._id !== from) {
          from = last._id;
        } else {
          hasMore = false;
        }
      }
    } catch (e) {
      console.error('Error obteniendo prensa:', e.message);
      hasMore = false;
    }
  }

  // Merge newly fetched news with local archive to ensure zero historical data loss
  const mergedMap = new Map();
  archivedNews.forEach(item => { if (item && item._id) mergedMap.set(item._id, item); });
  allNews.forEach(item => { if (item && item._id) mergedMap.set(item._id, item); });
  allNews = Array.from(mergedMap.values());

  try {
    fs.writeFileSync(archivePath, JSON.stringify(allNews, null, 2), 'utf8');
  } catch(e) {}

  // Obtener además las noticias del vestuario (/1/locker/news) para clausulazos en tiempo real
  const lockerPaidByName = {};
  const lockerReceivedByName = {};
  const lockerReceivedItemsByName = {};
  const lockerPaidItemsByName = {};
  try {
    const lockerData = await futmondoRequest('/1/locker/news', { championshipId });
    const lockerNews = lockerData?.news || [];
    console.log(`📡 [getPressroomStats] Noticias de vestuario obtenidas para ${championshipId}: ${lockerNews.length}`);
    lockerNews.forEach(n => {
      const clause = parseClauseText(n.text || n.txt);
      if (clause) {
        console.log(` 💥 Clausulazo Vestuario: ${clause.buyerName} -> ${clause.sellerName} (${clause.playerName} ${clause.price}€)`);
        lockerPaidByName[clause.buyerName] = (lockerPaidByName[clause.buyerName] || 0) + clause.price;
        lockerReceivedByName[clause.sellerName] = (lockerReceivedByName[clause.sellerName] || 0) + clause.price;

        const cost = getInitialVal(clause.playerName) || 0;
        const profit = clause.price - cost;

        if (!lockerReceivedItemsByName[clause.sellerName]) {
          lockerReceivedItemsByName[clause.sellerName] = [];
        }
        lockerReceivedItemsByName[clause.sellerName].push({
          buyerName: clause.buyerName,
          playerName: clause.playerName,
          price: clause.price,
          cost,
          profit,
          date: n.created || new Date().toISOString()
        });

        if (!lockerPaidItemsByName[clause.buyerName]) {
          lockerPaidItemsByName[clause.buyerName] = [];
        }
        lockerPaidItemsByName[clause.buyerName].push({
          sellerName: clause.sellerName,
          playerName: clause.playerName,
          price: clause.price,
          date: n.created || new Date().toISOString()
        });
      }
    });
  } catch (e) {
    console.error('Error obteniendo noticias del vestuario:', e.message);
  }

  // Deduplicar noticias por _id único para evitar duplicar transacciones entre páginas
  const seenNewsIds = new Set();
  const dedupedNews = [];
  allNews.forEach(item => {
    const id = item._id || item.id;
    if (id && !seenNewsIds.has(id)) {
      seenNewsIds.add(id);
      dedupedNews.push(item);
    }
  });

  const boughtByTeam = {};
  const buysByTeam = {};
  const salesByTeam = {};
  const buysMap = {};
  const tradesByTeam = {};
  const clausesReceivedByTeam = {};
  const buysListByTeam = {};
  const salesListByTeam = {};

  // Procesar noticias en orden cronológico (de más antigua a más reciente)
  const chronologicalNews = dedupedNews.slice().reverse();

  chronologicalNews.forEach(item => {
    if (typeof item.price === 'number' && item._player && item._player._id) {
      const pId = item._player._id;
      const pName = item._player.name || 'Jugador';
      const price = item.price;
      const date = item.created || '';

      if (item._buyer && item._buyer._id) {
        const buyerId = item._buyer._id;
        if (!boughtByTeam[buyerId]) boughtByTeam[buyerId] = new Set();
        boughtByTeam[buyerId].add(pId);
        buysByTeam[buyerId] = (buysByTeam[buyerId] || 0) + price;

        if (!buysMap[buyerId]) buysMap[buyerId] = {};
        buysMap[buyerId][pId] = { pName, buyPrice: price, buyDate: date };

        if (!buysListByTeam[buyerId]) buysListByTeam[buyerId] = [];
        buysListByTeam[buyerId].push({
          pId,
          playerName: pName,
          price,
          date,
          sellerName: item._seller?.name || item.seller?.name || 'Mercado'
        });
      }

      const sellerObj = item._seller || item.seller || item._vendor || item.vendor || item._userTeam;
      if (sellerObj && sellerObj._id) {
        const sellerId = sellerObj._id;
        salesByTeam[sellerId] = (salesByTeam[sellerId] || 0) + price;

        if (!salesListByTeam[sellerId]) salesListByTeam[sellerId] = [];
        salesListByTeam[sellerId].push({
          pId,
          playerName: pName,
          price,
          date,
          buyerName: item._buyer?.name || 'Mercado'
        });

        // Si la operación es entre dos mánagers (clausulazo / traspaso directo), contabilizar en Cláusulas Recibidas
        if (item._buyer && item._buyer._id && item._buyer._id !== sellerId) {
          clausesReceivedByTeam[sellerId] = (clausesReceivedByTeam[sellerId] || 0) + price;
        }

        // Si el vendedor compró anteriormente a este jugador en el mercado, es una operación de trading completada
        if (buysMap[sellerId] && buysMap[sellerId][pId]) {
          const buyInfo = buysMap[sellerId][pId];
          const profitLoss = price - buyInfo.buyPrice;

          if (!tradesByTeam[sellerId]) tradesByTeam[sellerId] = [];
          tradesByTeam[sellerId].push({
            pId,
            pName,
            buyPrice: buyInfo.buyPrice,
            sellPrice: price,
            profitLoss,
            buyDate: buyInfo.buyDate,
            sellDate: date
          });

          delete buysMap[sellerId][pId];
        }
      }
    }
  });

  const soldInitialByTeam = {};
  dedupedNews.forEach(item => {
    const sellerObj = item._seller || item.seller || item._vendor || item.vendor || item._userTeam;
    if (typeof item.price === 'number' && sellerObj && sellerObj._id && item._player && item._player._id) {
      const sellerId = sellerObj._id;
      const playerId = item._player._id;
      const boughtSet = boughtByTeam[sellerId] || new Set();
      if (!boughtSet.has(playerId)) {
        if (!soldInitialByTeam[sellerId]) soldInitialByTeam[sellerId] = [];
        soldInitialByTeam[sellerId].push(item);
      }
    }
  });

  return { boughtByTeam, buysByTeam, salesByTeam, soldInitialByTeam, tradesByTeam, clausesReceivedByTeam, lockerPaidByName, lockerReceivedByName, lockerReceivedItemsByName, lockerPaidItemsByName, buysListByTeam, salesListByTeam };
}
