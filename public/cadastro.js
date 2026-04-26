function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('closed');
}

function logout() {
  localStorage.removeItem('token');
  window.location.href = 'login.html';
}

const ctx = document.getElementById('graficoConsumo');

new Chart(ctx, {
  type: 'line',
  data: {
    labels: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'],
    datasets: [{
      label: 'Consumo (kWh)',
      data: [1.2, 1.8, 2.1, 1.9, 2.4, 2.0],
      tension: 0.4,
      fill: false
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        display: true
      }
    }
  }
});