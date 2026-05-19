// VERIFICA LOGIN
const token = localStorage.getItem("token");
const nome = localStorage.getItem("nomeUsuario");

const isLocal =
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost";

  
  if ((!token || !nome) && !isLocal) {
    window.location.href = "/login";
}

// ======================================================
// NOME DO USUÁRIO
// ======================================================

if (nome && nome !== "null" && nome !== "undefined") {

  const primeiroNome = nome.split(" ")[0];

  const nomeEl = document.getElementById("nomeUsuario");

  if (nomeEl) {
    nomeEl.innerText = primeiroNome;
  }

} else {

  console.warn("Nome não encontrado no localStorage");

}

// ======================================================
// SIDEBAR
// ======================================================

const toggleBtn = document.getElementById("toggleBtn");

const sidebar = document.getElementById("sidebar");

const topArea = document.querySelector(".top-area");

const mainContent = document.querySelector(".main-content");


function updateMargins() {

  if (sidebar.classList.contains("collapsed")) {

    if (topArea) {
      topArea.style.marginLeft = "90px";
    }

    mainContent.style.marginLeft = "90px";

  } else {

    if (topArea) {
      topArea.style.marginLeft = "100px";
    }

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

// ======================================================
// RESTAURA SIDEBAR
// ======================================================

window.addEventListener("load", function () {

  const sidebarState = localStorage.getItem("sidebarCollapsed");

  if (sidebarState === "true") {
    sidebar.classList.add("collapsed");
  }

  updateMargins();

});

// ======================================================
// LOGOUT
// ======================================================

const logoutBtn = document.querySelector(".logout-btn");

if (logoutBtn) {

  logoutBtn.addEventListener("click", function () {

    if (confirm("Deseja realmente sair?")) {

      localStorage.clear();

      window.location.href = "/";

    }

  });

}

//Grafico consumo do dia

  const ctxDia = document.getElementById("graficoConsumo");

  let graficoDia = new Chart(ctxDia, {

  type: "line",

  data: {

    labels: [],

    datasets: [

      {
        label: "Consumo do dia (kWh)",

        data: [],

        tension: 0.5,
        cubicInterpolationMode: 'monotone',

        fill: true,

        borderWidth: 2,

        pointRadius: 2,

        pointHoverRadius: 5
      }

    ]
  },

  options: {

    responsive: true,

    maintainAspectRatio: false,

    animation: false,

    scales: {

      y: {

        beginAtZero: false

      }

    }

  }

});


// ======================================================
// ATUALIZA CARDS
// ======================================================

async function atualizarDados() {

  try {

    const response =
      await fetch("/api/tempo-real");

    const dados = await response.json();

    document.getElementById("tensao").textContent =
      Number(dados.tensao).toFixed(2) + " V";

    document.getElementById("corrente").textContent =
      Number(dados.corrente).toFixed(2) + " A";

    document.getElementById("consumo").textContent =
      Number(dados.kwh).toFixed(3) + " kWh";

    document.getElementById("atualizacao").textContent =
      new Date(dados.instante).toLocaleTimeString();
    
    // atualiza gráfico diário
    graficoDia.data.labels = dados.labels || [];

    graficoDia.data.datasets[0].data =
      dados.dados || [];

    graficoDia.update();


// atualiza gráfico mensal
graficoMes.data.datasets[0].data =
  dados.mensal || [];

graficoMes.update();

  } catch (erro) {

    console.error("Erro ao atualizar cards:", erro);

  }

}

// inicia cards
atualizarDados();

// atualização automática
setInterval(atualizarDados, 2000);



// ======================================================
// GRÁFICO MENSAL
// ======================================================

const ctxMes = document.getElementById("graficoMes");

let graficoMes = new Chart(ctxMes, {

  type: "bar",

  data: {

    labels: [
      1,2,3,4,5,6,7,8,9,10,
      11,12,13,14,15,16,17,18,19,20,
      21,22,23,24,25,26,27,28,29,30,31
    ],

    datasets: [

      {
        label: "Consumo mensal (kWh)",

        data: [],

        borderWidth: 1,

        borderRadius: 8
      }

    ]
  },

  options: {

    responsive: true,

    maintainAspectRatio: false,

    animation: false,

    scales: {

      y: {

        beginAtZero: true

      }

    }

  }

});

// ======================================================
// RESUMO DA SEMANA
// ======================================================

function atualizarResumo(dados) {

  if (
    !dados ||
    dados.length === 0 ||
    dados.every(v => isNaN(Number(v)))
  ) {

    document.getElementById("totalSemana").textContent =
      "-- kWh";

    document.getElementById("mediaSemana").textContent =
      "-- kWh";

    document.getElementById("maxSemana").textContent =
      "-- kWh";

    document.getElementById("minSemana").textContent =
      "-- kWh";

    return;
  }

  const numeros = dados
    .map(Number)
    .filter(n => !isNaN(n));

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

// ======================================================
// CONVERTE SEMANA ISO
// ======================================================

function getDatasSemana(weekString) {

  const [ano, semana] = weekString.split("-W");

  const primeiroDia =
    new Date(ano, 0, 1 + (semana - 1) * 7);

  const diaSemana = primeiroDia.getDay();

  const inicio = new Date(primeiroDia);

  inicio.setDate(
    primeiroDia.getDate() - diaSemana + 1
  );

  const fim = new Date(inicio);

  fim.setDate(inicio.getDate() + 6);

  return { inicio, fim };

}

// ======================================================
// FILTRO SEMANA
// ======================================================

const filtroSemana =
  document.getElementById("filtroSemana");

if (filtroSemana) {

  filtroSemana.addEventListener(
    "change",

    async function () {

      const valor = this.value;

      // sem semana selecionada
      if (!valor) {

        atualizarResumo([]);
        return;

      }

      try {

        const response =
          await fetch(
            `/api/resumo-semana?semana=${valor}`
        );

        const dados = await response.json();

        // sem dados da semana
        if (
          !dados ||
          dados.length === 0 ||
          dados.every(v => isNaN(Number(v)))
      ) {

        const valores =
          dados.map(item => Number(item.total));

        atualizarResumo(valores);

      } catch (erro) {

        console.error(
          "Erro ao carregar resumo semanal:",
          erro
        );

        atualizarResumo([]);

      }

    }

  );

}

// ======================================================
// INIT RESUMO
// ======================================================

(function initResumo() {

  atualizarResumo([]);

})();