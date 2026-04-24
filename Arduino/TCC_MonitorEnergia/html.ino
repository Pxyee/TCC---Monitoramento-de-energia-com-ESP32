// ========== PÁGINA HTML DE CONFIGURAÇÃO ==========
const char* paginaConfig = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Configurar Monitor de Energia</title>
<style>
body {
  font-family: Arial, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  margin: 0;
}
.card {
  background: #fff;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.3);
  width: 350px;
  text-align: center;
}
h1 {
  color: #333;
  margin-bottom: 10px;
}
.subtitle {
  color: #666;
  font-size: 14px;
  margin-bottom: 20px;
}
label {
  display: block;
  text-align: left;
  font-weight: bold;
  color: #333;
  margin-top: 12px;
  margin-bottom: 5px;
}
input[type=text], input[type=password] {
  width: 100%;
  padding: 10px;
  margin: 5px 0 12px 0;
  border-radius: 6px;
  border: 2px solid #ddd;
  box-sizing: border-box;
  font-size: 14px;
}
input[type=text]:focus, input[type=password]:focus {
  outline: none;
  border-color: #667eea;
  background-color: #f9f9ff;
}
button {
  width: 100%;
  padding: 12px;
  margin-top: 20px;
  border: none;
  border-radius: 6px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: opacity 0.3s;
}
button:hover {
  opacity: 0.9;
}
#status {
  margin-top: 15px;
  font-size: 14px;
  min-height: 20px;
}
.success {
  color: #4CAF50;
}
.error {
  color: #f44336;
}
.info {
  color: #2196F3;
}
</style>
</head>
<body>
  <div class="card">
    <h1>⚡ Monitor de Energia</h1>
    <p class="subtitle">Configurar Conexão WiFi e Servidor</p>

    <form id="wifiForm">
      <label for="ssid">Nome da Rede WiFi (SSID):</label>
      <input type="text" id="ssid" name="ssid" placeholder="Ex: Claro_WiFi" required>

      <label for="password">Senha WiFi:</label>
      <input type="password" id="password" name="password" placeholder="Sua senha" required>

      <button type="submit">Conectar</button>
    </form>

    <div id="status"></div>
  </div>

  <script>
    document.getElementById('wifiForm').addEventListener('submit', async function(e) {
      e.preventDefault();

      const ssid = document.getElementById('ssid').value;
      const password = document.getElementById('password').value;
      const statusDiv = document.getElementById('status');

      statusDiv.className = 'info';
      statusDiv.innerText = 'Enviando dados de conexão...';

      try {
        const response = await fetch('/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'ssid=' + encodeURIComponent(ssid) + 
                '&password=' + encodeURIComponent(password)
        });

        if (response.ok) {
          statusDiv.className = 'success';
          statusDiv.innerText = '✓ Dados enviados! O ESP32 está conectando...';
        } else {
          statusDiv.className = 'error';
          statusDiv.innerText = '✗ Falha ao enviar dados.';
        }
      } catch (err) {
        statusDiv.className = 'error';
        statusDiv.innerText = '✗ Erro de conexão: ' + err.message;
      }
    });
  </script>
</body>
</html>
)rawliteral";