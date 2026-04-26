// TOGGLE SIDEBAR
const toggleBtn = document.getElementById("toggleBtn");
const sidebar = document.getElementById("sidebar");
const topArea = document.querySelector(".top-area");
const mainContent = document.querySelector(".main-content");

function updateMargins() {
  if (sidebar.classList.contains("collapsed")) {
    topArea.style.marginLeft = "90px";
    mainContent.style.marginLeft = "90px";
  } else {
    topArea.style.marginLeft = "250px";
    mainContent.style.marginLeft = "250px";
  }
}

toggleBtn.addEventListener("click", function () {
  sidebar.classList.toggle("collapsed");
  updateMargins();
  
  // Salvar estado no localStorage
  const isCollapsed = sidebar.classList.contains("collapsed");
  localStorage.setItem("sidebarCollapsed", isCollapsed);
});

// Restaurar estado do sidebar ao carregar a página
window.addEventListener("load", function () {
  const sidebarState = localStorage.getItem("sidebarCollapsed");
  if (sidebarState === "true") {
    sidebar.classList.add("collapsed");
    updateMargins();
  }
});

// EVENTOS DOS BOTÕES DO FOOTER
document.querySelector(".user-btn").addEventListener("click", function () {
  alert("Perfil do usuário");
});

document.querySelector(".calendar-btn").addEventListener("click", function () {
  alert("Abrir calendário");
});

document.querySelector(".logout-btn").addEventListener("click", function () {
  const confirmLogout = confirm("Deseja realmente sair?");
  if (confirmLogout) {
    alert("Desconectado com sucesso!");
    // Aqui você pode redirecionar para a página de login
    // window.location.href = "login.html";
  }
});

// DADOS DO DASHBOARD
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

const ctx = document.getElementById("graficoConsumo");

new Chart(ctx, {
  type: "line",
  data: {
    labels: [
      "08:00",
      "10:00",
      "12:00",
      "14:00",
      "16:00",
      "18:00"
    ],
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
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top"
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  }
});