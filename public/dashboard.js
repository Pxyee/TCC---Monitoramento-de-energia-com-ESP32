// 🔐 VERIFICA LOGIN
const token = localStorage.getItem("token");
const nome = localStorage.getItem("nomeUsuario");

const isLocal =
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost";

// 🔒 proteção (ative depois)
// if ((!token || !nome) && !isLocal) {
//   window.location.href = "login.html";
// }


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

      window.location.href = "login.html";

    }

  });

}


// ======================================================
// 📊 ATUALIZA CARDS
// ======================================================
// depois substituir pela API
// ======================================================

async function atualizarDados() {

  try {

    const response =
      await fetch("http://voltsense.com.br:3000/api/tempo-real");

    const dados = await response.json();

    document.getElementById("tensao").textContent =
      dados.tensao + " V";

    document.getElementById("corrente").textContent =
      dados.corrente + " A";

    document.getElementById("consumo").textContent =
      dados.kwh + " kWh";

    document.getElementById("atualizacao").textContent =
      new Date(dados.instante).toLocaleTimeString();

  } catch (erro) {

    console.error("Erro ao atualizar cards:", erro);

  }

}

    // TEMPORÁRIO
    const tensao = "--";

    const corrente = "--";

    const consumo = "--";


    try {
    document.getElementById("tensao").textContent =
      tensao + " V";

    document.getElementById("corrente").textContent =
      corrente + " A";

    document.getElementById("consumo").textContent =
      consumo + " kWh";

    document.getElementById("atualizacao").textContent =
      new Date().toLocaleTimeString();
    } catch (erro) {
    console.error("Erro ao atualizar cards:", erro);
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
      await fetch("http://voltsense.com.br:3000/api/consumo-dia");

    const dados = await response.json();

    // horários
    const labelsDia = dados.map(item => item.hora);

    // consumo
    const dadosDia = dados.map(item => item.kwh);

    // destrói gráfico antigo
    if (graficoDia) {
      graficoDia.destroy();
    }

    graficoDia = new Chart(ctxDia, {

      type: "line",

      data: {

        labels: labelsDia,

        datasets: [

          {
            label: "Consumo do dia (kWh)",

            data: dadosDia,

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

    const response = await fetch("http://voltsense.com.br:3000/api/consumo-mes")

    const dados = await response.json();

    // dias
    const labelsMes = dados.map(item => item.dia);

    // consumo
    const dadosMes = dados.map(item => item.total);


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

        maintainAspectRatio: false

      }

    });

  } catch (erro) {

    console.error("Erro ao carregar gráfico mensal:", erro);

  }

}


// inicia gráfico mensal
carregarGraficoMes();



// ======================================================
// 📊 RESUMO DA SEMANA
// ======================================================

function atualizarResumo(dados) {

  // sem dados
  if (!dados || dados.length === 0) {

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
// 📅 CONVERTE SEMANA ISO
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
// 📅 FILTRO SEMANA
// ======================================================

const filtroSemana =
  document.getElementById("filtroSemana");


if (filtroSemana) {

  filtroSemana.addEventListener(
    "change",

    async function () {

      const valor = this.value;

      if (!valor) return;

      const { inicio, fim } =
        getDatasSemana(valor);

      console.log("Semana:", valor);

      console.log("De:", inicio);

      console.log("Até:", fim);


      // ================================================
      // 🔥 FUTURA API RESUMO SEMANAL
      // ================================================

      /*
      const response =
        await fetch("/api/resumo-semana");

      const dados = await response.json();

      atualizarResumo(dados);
      */


      // temporário
      atualizarResumo([]);

    }

  );

}



// ======================================================
// 🚀 INIT RESUMO
// ======================================================

(function initResumo() {

  atualizarResumo([]);

})();