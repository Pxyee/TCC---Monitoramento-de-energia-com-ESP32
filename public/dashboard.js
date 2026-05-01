// 🔐 Verifica se está logado
const token = localStorage.getItem("token");
const nome = localStorage.getItem("nomeUsuario");

const isLocal =
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost";

// if ((!token || !nome) && !isLocal) {
//   window.location.href = "login.html";
// }

// 👤 Nome do usuário
if (nome) {
  const primeiroNome = nome.split(" ")[0];
  const nomeEl = document.getElementById("nomeUsuario");
  if (nomeEl) nomeEl.innerText = primeiroNome;
}

// 📂 SIDEBAR
const toggleBtn = document.getElementById("toggleBtn");
const sidebar = document.getElementById("sidebar");
const topArea = document.querySelector(".top-area");
const mainContent = document.querySelector(".main-content");

function updateMargins() {
  if (sidebar.classList.contains("collapsed")) {
    topArea.style.marginLeft = "90px";
    mainContent.style.marginLeft = "90px";
  } else {
    topArea.style.marginLeft = "100px";
    mainContent.style.marginLeft = "250px";
  }
}

if (toggleBtn) {
  toggleBtn.addEventListener("click", function () {
    sidebar.classList.toggle("collapsed");
    updateMargins();

    localStorage.setItem(
      "sidebarCollapsed",
      sidebar.classList.contains("collapsed")
    );
  });
}

// restaurar sidebar
window.addEventListener("load", function () {
  const sidebarState = localStorage.getItem("sidebarCollapsed");
  if (sidebarState === "true") {
    sidebar.classList.add("collapsed");
    updateMargins();
  }
});

// 🚪 LOGOUT
const logoutBtn = document.querySelector(".logout-btn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", function () {
    if (confirm("Deseja realmente sair?")) {
      localStorage.clear();
      window.location.href = "login.html";
    }
  });
}

// 📊 DADOS FAKE
function atualizarDados() {
  const tensao = (220 + Math.random() * 10).toFixed(1);
  const corrente = (10 + Math.random() * 5).toFixed(2);
  const consumo = (1 + Math.random() * 2).toFixed(2);

  document.getElementById("tensao").textContent = tensao + " V";
  document.getElementById("corrente").textContent = corrente + " A";
  document.getElementById("consumo").textContent = consumo + " kWh";
  document.getElementById("atualizacao").textContent =
    new Date().toLocaleTimeString();
}

atualizarDados();
setInterval(atualizarDados, 2000);

// 📈 GRÁFICO
const ctx = document.getElementById("graficoConsumo");

if (ctx) {
  new Chart(ctx, {
    type: "line",
    data: {
      labels: ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"],
      datasets: [
        {
          label: "Consumo (kWh)",
          data: [1.2, 1.8, 2.1, 1.9, 2.4, 2.0],
          tension: 0.4,
          fill: true,
          borderWidth: 2,
          pointRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

// 📊 RESUMO
function atualizarResumo(dados) {
  const numeros = dados.map(Number);

  const total = numeros.reduce((a, b) => a + b, 0);
  const media = total / numeros.length;
  const max = Math.max(...numeros);
  const min = Math.min(...numeros);

  document.getElementById("totalSemana").textContent =
    total.toFixed(2) + " kWh";
  document.getElementById("mediaSemana").textContent =
    media.toFixed(2) + " kWh";
  document.getElementById("maxSemana").textContent =
    max.toFixed(2) + " kWh";
  document.getElementById("minSemana").textContent =
    min.toFixed(2) + " kWh";
}

// 📅 CONVERTER SEMANA → DATAS
function getDatasSemana(weekString) {
  const [ano, semana] = weekString.split("-W");

  const primeiroDia = new Date(ano, 0, 1 + (semana - 1) * 7);
  const diaSemana = primeiroDia.getDay();

  const inicio = new Date(primeiroDia);
  inicio.setDate(primeiroDia.getDate() - diaSemana + 1);

  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);

  return { inicio, fim };
}

// 📅 FILTRO SEMANA (CORRIGIDO)
const filtroSemana = document.getElementById("filtroSemana");

if (filtroSemana) {
  filtroSemana.addEventListener("change", function () {
    const valor = this.value;

    console.log("Semana selecionada:", valor);

    const { inicio, fim } = getDatasSemana(valor);

    console.log("De:", inicio);
    console.log("Até:", fim);

    // 🔥 dados fake por enquanto
    const novosDados = Array.from({ length: 7 }, () =>
      (1 + Math.random() * 2).toFixed(2)
    );

    atualizarResumo(novosDados);
  });
} 