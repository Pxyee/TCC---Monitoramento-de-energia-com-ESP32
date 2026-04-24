
//         ╔══════════════════════════════════╗
//         ║  MONITOR DE ENERGIA - ESP32      ║
//         ║  SCT013-020 (20A)                ║
//         ╚══════════════════════════════════╝


#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Wire.h>
#include <EEPROM.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#define Reset 12
#define led_vd 23
#define led_vm 22


// ========== PROTÓTIPOS DE FUNÇÕES ==========
void conectarWiFi();
void lerSensor();
void enviarDados();
void salvarWiFiEEPROM();
void lerWiFiEEPROM();
void apagarWiFiEEPROM();
void apagandoWiFiEEPROM();
void verificaEEPROM();

// ========== CONFIGURAÇÕES WiFi ==========
const byte DNS_PORT = 53;
DNSServer dnsServer;
WebServer server(80);

const char* ssid_ap = "MonitorEnergia";
const char* password_ap = "12345678";
extern const char* paginaConfig;

unsigned int contadorBotao = 0;

String wifi_ssid = "";
String wifi_password = "";
//  COLOQUE A URL DO SEU SERVIDOR AQUI (ex: http://seu-ip:3000)
String server_url = "";
bool conectado = false;
bool apagar = false;

// ========== CONFIGURAÇÕES SENSOR SCT013-020 ==========
const int pino_adc = 34;           // Pino analógico do ESP32
const float burden_resistor = 62.0; // Resistência de carga (ohms)
const float primary_current = 20.0; // SCT013-020 (até 20A) ← ALTERADO
const float tensao_rede = 220.0;   // Tensão da tomada (V)
const int amostras = 1000;         // Quantidade de leituras por ciclo

// ========== VARIÁVEIS DE LEITURA ==========
float corrente_rms = 0;
float potencia = 0;
float kwh = 0;
unsigned long ultima_leitura = 0;
const unsigned long intervalo_leitura = 3600000; // 1 hora em ms

// ========== ENDEREÇO EEPROM ==========
const int endereco_eeprom_ssid = 0;
const int endereco_eeprom_pass = 50;
const int endereco_eeprom_url = 100;


// ========== LER SENSOR SCT013 ==========
void lerSensor() {
  double soma_quadrados = 0;
  
  // Coleta múltiplas amostras para calcular RMS
  for (int i = 0; i < amostras; i++) {
    // Lê tensão do pino analógico (0-4095 representa 0-3.3V)
    int valor_adc = analogRead(pino_adc);
    
    // Converte valor ADC em tensão (3.3V / 4095 = 0.000805V por bit)
    float tensao_adc = valor_adc * (3.3 / 4095.0);
    
    // Subtrai 1.65V (ponto de repouso médio para centrar)
    float tensao_centrada = tensao_adc - 1.65;
    
    // Converte tensão do ADC em corrente real do primário
    // I = V / R, onde R = burden_resistor (62 ohms)
    // Multiplicado pela razão do transformador (20A / 1mA)
    float corrente_instantanea = (tensao_centrada / burden_resistor) * (primary_current / 1.0);
    
    // Acumula quadrados i² para calcular RMS depois
    soma_quadrados += corrente_instantanea * corrente_instantanea;
    
    delay(1); // 1ms entre leituras
  }
  
  // Calcula RMS: sqrt(média dos quadrados)
  corrente_rms = sqrt(soma_quadrados / amostras);
  
  // Calcula potência: P = V × I (em Watts)
  potencia = tensao_rede * corrente_rms;
  
  // Estima KWh (simplificado: potência em kW)
  kwh = potencia / 1000.0;
  
  // Printa no Serial para debug
  Serial.println("\n=== LEITURA DO SENSOR ===");
  Serial.print("Corrente RMS: ");
  Serial.print(corrente_rms, 2);
  Serial.println(" A");
  Serial.print("Potência: ");
  Serial.print(potencia, 2);
  Serial.println(" W");
  Serial.print("KWh (estimado): ");
  Serial.println(kwh, 4);
  Serial.println("=======================\n");
}

// ========== SALVAR CREDENCIAIS NA EEPROM ==========
void salvarWiFiEEPROM() {
  Serial.println("Salvando credenciais na EEPROM...");
  
  // Limpa EEPROM
  for (int i = 0; i < 512; i++) {
    EEPROM.write(i, 0);
  }
  
  // Salva SSID (máx 50 caracteres)
  for (int i = 0; i < wifi_ssid.length() && i < 50; i++) {
    EEPROM.write(endereco_eeprom_ssid + i, wifi_ssid[i]);
  }
  
  // Salva Senha (máx 50 caracteres)
  for (int i = 0; i < wifi_password.length() && i < 50; i++) {
    EEPROM.write(endereco_eeprom_pass + i, wifi_password[i]);
  }
  
  EEPROM.commit(); // Confirma gravação
  Serial.println("✓ Credenciais salvas na EEPROM!");
}

void apagarWiFiEEPROM()
{
  while(!digitalRead(Reset)) 
  {
    contadorBotao++;
    delay(1);
    if(contadorBotao >= 5000)
    {
      Serial.println("RESETANDO");
      contadorBotao = 0;
      apagar = true;
    }
  }
  //else
  //{
    contadorBotao = 0;
  //}
}

void apagandoWiFiEEPROM()
{
  if(apagar)
  {
    delay(1000);
    for (int i = 0; i < EEPROM.length(); i++) 
    {
      EEPROM.write(i, 0);
    }
    EEPROM.commit();
    apagar = false;
    delay(200);
    ESP.restart();
  }
}



// ========== LER CREDENCIAIS DA EEPROM ==========
void lerWiFiEEPROM() {
  char ssid_temp[51] = {0};
  char pass_temp[51] = {0};
  
  // Lê SSID
  for (int i = 0; i < 50; i++) {
    ssid_temp[i] = EEPROM.read(endereco_eeprom_ssid + i);
    if (ssid_temp[i] == 0 || ssid_temp[i] == 255) break;
  }
  
  // Lê Senha
  for (int i = 0; i < 50; i++) {
    pass_temp[i] = EEPROM.read(endereco_eeprom_pass + i);
    if (pass_temp[i] == 0 || pass_temp[i] == 255) break;
  }
  
  wifi_ssid = String(ssid_temp);
  wifi_password = String(pass_temp);
  
  if (wifi_ssid.length() > 0 || wifi_ssid.length() < 255) 
  {
    Serial.println("✓ Credenciais recuperadas da EEPROM!");
    Serial.println("  SSID: " + wifi_ssid);
  }
}

// ========== ENVIAR DADOS AO SERVIDOR ==========
void enviarDados() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("✗ WiFi não conectado!");
    return;
  }
  
  HTTPClient http;
  
  // Monta a URL completa
  String url = server_url + "/api/energia";
  
  Serial.print("Enviando dados para: ");
  Serial.println(url);
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  // Monta JSON com dados
  StaticJsonDocument<200> doc;
  doc["tensao"] = tensao_rede;
  doc["corrente"] = corrente_rms;
  doc["kwh"] = kwh;
  
  String json;
  serializeJson(doc, json);
  
  Serial.print("JSON: ");
  Serial.println(json);
  
  // Faz POST
  int httpResponseCode = http.POST(json);
  
  if (httpResponseCode == 200) {
    Serial.println("✓✓✓ Dados enviados com sucesso!");
    String resposta = http.getString();
    Serial.println("Resposta: " + resposta);
  } else {
    Serial.print("✗ Erro na resposta HTTP: ");
    Serial.println(httpResponseCode);
    if (httpResponseCode > 0) {
      Serial.println("Resposta: " + http.getString());
    }
  }
  
  http.end();
}

// ========== CONECTAR AO WiFi ==========
void conectarWiFi() {
  Serial.print("\nConectando em: ");
  Serial.println(wifi_ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(wifi_ssid.c_str(), wifi_password.c_str());
  
  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED && tentativas < 20) 
  {
    delay(500);
    Serial.print(".");
    tentativas++;
  }
  
  if (WiFi.status() == WL_CONNECTED) 
  {
    Serial.println("\n✓ Conectado com sucesso!");
    Serial.print("IP local: ");
    Serial.println(WiFi.localIP());
    
    // Desliga o AP quando conectado
    WiFi.softAPdisconnect(true);
    Serial.println("Portal WiFi desativado.");
    
    conectado = true;
  } 
  else 
  {
    Serial.println("\n✗ Falha na conexão!");
    Serial.println("Reabrindo portal de configuração...");
    WiFi.softAP(ssid_ap, password_ap);
  }
}

// ========== SETUP ==========
void setup() {
  Serial.begin(115200);

  pinMode(Reset, INPUT_PULLUP);
  pinMode(led_vd, OUTPUT);
  pinMode(led_vm, OUTPUT);

  digitalWrite(led_vd, LOW);
  digitalWrite(led_vm, HIGH); // IMPLEMENTAR DEPOIS FUNÇÃO PARA TROCAR AS CORES

  delay(1000);
  
  Serial.println("\n\n╔══════════════════════════════════╗");
  Serial.println("║  MONITOR DE ENERGIA - ESP32      ║");
  Serial.println("║  SCT013-020 (20A)                ║");
  Serial.println("╚══════════════════════════════════╝\n");
  
  // Inicializa EEPROM
  EEPROM.begin(512);
  
  apagarWiFiEEPROM();
  apagandoWiFiEEPROM();

  // Tenta recuperar credenciais salvas
  lerWiFiEEPROM();
  
  // Se encontrou credenciais, tenta conectar direto
  if (wifi_ssid.length() > 0) {
    Serial.println("► Tentando conectar com credenciais salvas...");
    WiFi.mode(WIFI_STA);
    WiFi.begin(wifi_ssid.c_str(), wifi_password.c_str());
    
    int tentativas = 0;
    while (WiFi.status() != WL_CONNECTED && tentativas < 15) {
      delay(500);
      Serial.print(".");
      tentativas++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\n✓ Conectado!");
      Serial.print("   IP: ");
      Serial.println(WiFi.localIP());
      ultima_leitura = millis();
      return; // Sucesso, sai do setup
    }
  }
  
  // Se chegou aqui, abre portal de configuração
  Serial.println("► Abrindo portal WiFi de configuração...");
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(ssid_ap, password_ap);
  
  dnsServer.start(DNS_PORT, "*", WiFi.softAPIP());
  
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.println("Acesse o portal em:");
  Serial.print("  http://");
  Serial.println(WiFi.softAPIP());
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  
  // Configura rotas HTTP
  server.on("/", []() {
    server.send(200, "text/html", paginaConfig);
  });
  
  server.on("/connect", HTTP_POST, []() {
    wifi_ssid = server.arg("ssid");
    wifi_password = server.arg("password");
    
    server.send(200, "text/html", "<h3>Conectando...</h3><p>O ESP32 vai se conectar agora.</p>");
    
    // Salva SenhaAo na EEPROM para próxima vez
    salvarWiFiEEPROM();
    
    delay(500);
    conectarWiFi();
  });
  
  server.onNotFound([]() {
    server.sendHeader("Location", "/", true);
    server.send(302, "text/plain", "");
  });
  
  server.begin();
}

// ========== LOOP ==========
void loop() 
{
  // Se em modo AP (portal de configuração ativo)
  if (WiFi.getMode() == WIFI_AP_STA || WiFi.getMode() == WIFI_AP) {
    dnsServer.processNextRequest();
    server.handleClient();
    return;
  }
  
  // Se conectado ao WiFi
  if (WiFi.status() == WL_CONNECTED) {
    unsigned long agora = millis();
    // Verifica se passou 1 hora desde última leitura
    if (agora - ultima_leitura >= intervalo_leitura) {
      Serial.println("\n▶ [AÇÃO] Lendo sensor...");
      lerSensor();
      
      Serial.println("▶ [AÇÃO] Enviando dados ao servidor...");
      enviarDados();
      
      ultima_leitura = agora;
      
      unsigned long proxima = intervalo_leitura / 60000; // Converte para minutos
      Serial.print("▶ Próxima leitura em ");
      Serial.print(proxima);
      Serial.println(" minutos.\n");
    }
  } else {
    // Perdeu conexão, tenta reconectar
    Serial.println("✗ WiFi desconectado. Tentando reconectar...");
    WiFi.reconnect();
    delay(5000);
  }
  
  delay(100); // Pequena pausa para não sobrecarregar
}
