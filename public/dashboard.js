// 🔐 VERIFICA LOGIN
const token = localStorage.getItem("token");
const nome = localStorage.getItem("nomeUsuario");

const isLocal =
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost";

//if ((!token || !nome) && !isLocal) {
  //window.location.href = "/login";
//}


// ======================================================
// 👤 NOME DO USUÁRIO
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
// 📂 SIDEBAR
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
// 🔄 RESTAURA SIDEBAR
// ======================================================

window.addEventListener("load", function () {

  const sidebarState = localStorage.getItem("sidebarCollapsed");

  if (sidebarState === "true") {
    sidebar.classList.add("collapsed");
  }

  updateMargins();

});


// ======================================================
// 🚪 LOGOUT
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


// ======================================================
// 📊 ATUALIZA CARDS
// ======================================================

async function atualizarDados() {

  try {

    const response =
      await fetch("/api/tempo-real");

    const dados = await response.json();

    document.getElementById("tensao").textContent =
      Number(dados.tensao).toFixed(1) + " V";

    document.getElementById("corrente").textContent =
      Number(dados.corrente).toFixed(2) + " A";

    const consumo = Number(dados.kwh);

    document.getElementById("consumo").textContent =

      consumo < 1
        ? (consumo * 1000).toFixed(0) + " Wh"
        : consumo.toFixed(2) + " kWh";

    document.getElementById("atualizacao").textContent =
      new Date(dados.instante).toLocaleTimeString();

  } catch (erro) {

    console.error("Erro ao atualizar cards:", erro);

  }

}


// inicia cards
atualizarDados();


// atualização automática
setInterval(atualizarDados, 2000);



// ======================================================
// 📈 GRÁFICO CONSUMO DO DIA
// ======================================================

const ctxDia = document.getElementById("graficoConsumo");

let graficoDia;

async function carregarGraficoDia() {

  try {

    const response =
      await fetch("/api/consumo-dia");

    const dados = await response.json();

    // horários
    const labelsDia = dados.map(item => item.hora);

    // consumo
    const dadosDia = dados.map(item => Number(item.kwh));

    // destrói gráfico antigo
    if (graficoDia) {
      graficoDia.destroy();
    }

    // limites do gráfico
    let minY = 0;
    let maxY = 1;

    if (dadosDia.length > 0) {

      const menor = Math.min(...dadosDia);
      const maior = Math.max(...dadosDia);

      if (menor !== maior) {

        minY = menor * 0.95;
        maxY = maior * 1.05;

      } else {

        minY = 0;
        maxY = maior * 1.2;

      }

    }

    graficoDia = new Chart(ctxDia, {

      type: "line",

      data: {

        labels: labelsDia,

        datasets: [

          {
            label: "Consumo do dia",

            data: dadosDia,

            tension: 0.5,

            cubicInterpolationMode: 'monotone',

            fill: true,

            borderWidth: 3,

            pointRadius: 3,

            pointHoverRadius: 6,

            hitRadius: 10,

            backgroundColor:
              'rgba(54, 162, 235, 0.15)'
          }

        ]
      },

      options: {

        responsive: true,

        maintainAspectRatio: false,

        animation: false,

        plugins: {

          tooltip: {

            callbacks: {

              label: function(context) {

                const valor = context.raw;

                return valor < 1
                  ? (valor * 1000).toFixed(0) + " Wh"
                  : valor.toFixed(2) + " kWh";

              }

            }

          }

        },

        scales: {

          y: {

            beginAtZero: false,

            min: minY,

            max: maxY,

            ticks: {

              callback: function(value) {

                return value < 1
                  ? (value * 1000) + " Wh"
                  : value + " kWh";

              }

            }

          }

        }

      }

    });

  } catch (erro) {

    console.error(
      "Erro ao carregar gráfico do dia:",
      erro
    );

  }

}


// inicia gráfico
carregarGraficoDia();


// atualiza automaticamente
setInterval(carregarGraficoDia, 10000);



// ======================================================
// 📊 GRÁFICO ACUMULADO DO MÊS
// ======================================================

const ctxMes = document.getElementById("graficoMes");

let graficoMes;


async function carregarGraficoMes() {

  try {

    const response = await fetch("/api/consumo-mes");

    const dados = await response.json();

    // arrays
    const labelsMes = [];
    const dadosMes = [];

    // mapa
    const mapaDados = {};

    dados.forEach(item => {
      mapaDados[item.dia] = item.total;
    });

    // preenche 31 dias
    for (let i = 1; i <= 31; i++) {

      labelsMes.push(i);

      dadosMes.push(mapaDados[i] || 0);

    }

    // destrói gráfico antigo
    if (graficoMes) {
      graficoMes.destroy();
    }

    graficoMes = new Chart(ctxMes, {

      type: "bar",

      data: {

        labels: labelsMes,

        datasets: [

          {
            label: "Consumo mensal (kWh)",

            data: dadosMes,

            borderWidth: 1,

            borderRadius: 8
          }

        ]

      },

      options: {

        responsive: true,

        maintainAspectRatio: false,

        animation: false,

        plugins: {

          tooltip: {

            callbacks: {

              label: function(context) {

                const valor = context.raw;

                return valor < 1
                  ? (valor * 1000).toFixed(0) + " Wh"
                  : valor.toFixed(2) + " kWh";

              }

            }

          }

        },

        scales: {

          y: {

            beginAtZero: true,

            ticks: {

              callback: function(value) {

                return value < 1
                  ? (value * 1000) + " Wh"
                  : value + " kWh";

              }

            }

          }

        }

      }

    });

  } catch (erro) {

    console.error("Erro ao carregar gráfico mensal:", erro);

  }

}


// inicia gráfico mensal
carregarGraficoMes();


// atualiza automaticamente
setInterval(carregarGraficoMes, 30000);



// ======================================================
// 📊 RESUMO DA SEMANA
// ======================================================

function atualizarResumo(dados) {

  if (!dados || dados.length === 0) {

    document.getElementById("totalSemana").textContent =
      "--";

    document.getElementById("mediaSemana").textContent =
      "--";

    document.getElementById("maxSemana").textContent =
      "--";

    document.getElementById("minSemana").textContent =
      "--";

    return;
  }

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


// ======================================================
// 📊 CARREGA RESUMO SEMANAL
// ======================================================

async function carregarResumoSemana() {

  try {

    const response =
      await fetch("/api/resumo-semana");

    const dados = await response.json();

    const valores =
      dados.map(item => Number(item.total));

    atualizarResumo(valores);

  } catch (erro) {

    console.error(
      "Erro ao carregar resumo semanal:",
      erro
    );

  }

}


// inicia resumo
carregarResumoSemana();


// atualiza automático
setInterval(carregarResumoSemana, 30000);