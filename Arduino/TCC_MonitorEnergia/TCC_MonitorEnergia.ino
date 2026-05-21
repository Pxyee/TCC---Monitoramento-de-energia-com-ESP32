
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
#include "EmonLib.h"
#include <vector>
#include <time.h>

#define Reset 12
#define led_vd 23
#define led_vm 22


// ========== PROTÓTIPOS DE FUNÇÕES ==========
void conectarWiFi();
bool lerSensor();
bool enviarDados();
void salvarWiFiEEPROM();
void lerWiFiEEPROM();
void apagarWiFiEEPROM();
void apagandoWiFiEEPROM();
void verificaEEPROM();

// ========== CONFIGURAÇÕES WiFi ==========
const byte DNS_PORT = 53;
DNSServer dnsServer;
WebServer server(80);

unsigned char noReset = 0;

const char* ssid_ap = "MonitorEnergia";
const char* password_ap = "12345678";
extern const char* paginaConfig;

unsigned int contadorBotao = 0;

String wifi_ssid = "";
String wifi_password = "";
String server_url = "http://voltsense.com.br:3000";
bool conectado = false;
bool apagar = false;
bool reset = false;


// ========== CONFIGURAÇÕES SENSOR SCT013-020 ==========
const int pino_adc = 34;           // Pino analógico do ESP32
const int pinoRede = 33;           // Pino digital que detecta presença da rede elétrica
const bool redeAtivaEmHigh = true; // true se sinal de rede for HIGH quando a rede estiver presente
bool redePresente = false;
bool envioQuedaEnergiaRealizado = false;
bool quedaEnergiaPendente = false;
const float burden_resistor = 62.0; // Resistência de carga (ohms)
const float primary_current = 20.0; // SCT013-020 (até 20A) ← ALTERADO
const float tensao_rede = 127.0;   // Tensão da tomada (V)
const int amostras = 1000;         // Quantidade de leituras por ciclo
int ultimoDia = -1;
float consumoDiario = 0;
float consumoMensal[31] = {0};
std::vector<float> historicoConsumo;
std::vector<String> historicoHorario;

// ========== VARIÁVEIS DE LEITURA ==========
double corrente_rms = 0;
float potencia = 0;
float kwh = 0;
unsigned long ultima_leitura = 0;
const unsigned long intervalo_leitura = 30000; // 30 segundos
int leiturasIgnoradas = 0;

// ========== ENDEREÇO EEPROM ==========
const int endereco_eeprom_ssid = 0;
const int endereco_eeprom_pass = 50;
const int endereco_eeprom_url = 100;
const int endereco_eeprom_kwh = 200;
const int endereco_eeprom_consumo_diario = 204;
const int endereco_eeprom_ultimoDia = 208;
const int endereco_eeprom_consumo_mensal = 212;
const int endereco_eeprom_marker = 400; // marca de validação de dados salvos

EnergyMonitor emon1;

// ========== LER SENSOR SCT013 ==========
bool lerSensor() {

  corrente_rms = emon1.calcIrms(4000);  // Calculate Irms only
  // ignora primeiras leituras após ligar
  if (leiturasIgnoradas < 3) {

    leiturasIgnoradas++;

    corrente_rms = 0;

    Serial.println("Ignorando leitura inicial...");

    return false;
  }


  if (corrente_rms < 0.15)
   {
  corrente_rms = 0;
  }
  Serial.print(corrente_rms * tensao_rede);           // Apparent power
  Serial.print(" ");
  Serial.println(corrente_rms);               // Irms

 /* double soma_quadrados = 0;
  
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
  corrente_rms = sqrt(soma_quadrados / amostras);*/
  
  // Calcula potência: P = V × I (em Watts)
  potencia = tensao_rede * corrente_rms;
  
  // Estima KWh (simplificado: potência em kW)
  //kwh = potencia / 1000.0; 
  float horas = intervalo_leitura / 3600000.0;
  float consumoAtual = (potencia * horas) / 1000.0;


  kwh += consumoAtual;
  consumoDiario += consumoAtual;
  
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
  time_t now = time(nullptr);
  struct tm *timeinfo = localtime(&now);

  char horario[6];

  sprintf(horario, "%02d:%02d",
        timeinfo->tm_hour,
        timeinfo->tm_min);

  historicoHorario.push_back(String(horario));
  historicoConsumo.push_back(consumoDiario);
  Serial.println("=======================\n");

  // salva o estado atual em EEPROM para recuperar após reinício
  salvarEstadoEEPROM();
  
  return true;
}

void salvarEstadoEEPROM() {
  EEPROM.put(endereco_eeprom_kwh, kwh);
  EEPROM.put(endereco_eeprom_consumo_diario, consumoDiario);
  EEPROM.put(endereco_eeprom_ultimoDia, ultimoDia);
  for (int i = 0; i < 31; i++) {
    EEPROM.put(endereco_eeprom_consumo_mensal + i * sizeof(float), consumoMensal[i]);
  }
  EEPROM.write(endereco_eeprom_marker, 0xA5);
  EEPROM.commit();
}

void carregarEstadoEEPROM() {
  if (EEPROM.read(endereco_eeprom_marker) == 0xA5) {
    EEPROM.get(endereco_eeprom_kwh, kwh);
    EEPROM.get(endereco_eeprom_consumo_diario, consumoDiario);
    EEPROM.get(endereco_eeprom_ultimoDia, ultimoDia);
    for (int i = 0; i < 31; i++) {
      EEPROM.get(endereco_eeprom_consumo_mensal + i * sizeof(float), consumoMensal[i]);
    }
    Serial.println("Estado de energia recuperado da EEPROM.");
    Serial.print("kWh: ");
    Serial.println(kwh, 4);
    Serial.print("Consumo diário: ");
    Serial.println(consumoDiario, 4);
  } else {
    Serial.println("Nenhum estado de energia válido encontrado na EEPROM.");
  }
}

// ========== SALVAR CREDENCIAIS NA EEPROM ==========
void salvarWiFiEEPROM() {
  Serial.println("Salvando credenciais na EEPROM...");
  
  // Limpa apenas a área de SSID / senha / URL
  for (int i = endereco_eeprom_ssid; i < endereco_eeprom_url + 100; i++) {
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
  while(!reset) 
  {
    //contadorBotao++;
    delay(1);
    if(!digitalRead(Reset))
    {
      contadorBotao++;
      if(contadorBotao >= 5000)
      {
        Serial.println("RESETANDO");
        contadorBotao = 0;
        reset = 1;
        apagar = true;
      }
    }
    else
    {
      noReset++;
      if(noReset >= 200)
      {
        contadorBotao = 0;
        noReset = 0;
        reset = 1;
      }
    }
  }
}

void apagandoWiFiEEPROM()
{
  if(apagar)
  {
    digitalWrite(led_vm, HIGH);
    digitalWrite(led_vd, HIGH);
    delay(1000);
    for (int i = endereco_eeprom_ssid; i < endereco_eeprom_url + 100; i++) 
    {
      EEPROM.write(i, 0);
    }
    EEPROM.commit();
    apagar = false;
    delay(3000);
    digitalWrite(led_vm, LOW);
    digitalWrite(led_vd, LOW);
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
  
  if (wifi_ssid.length() > 0 && wifi_ssid.length() < 255) 
  {
    Serial.println("Credenciais recuperadas da EEPROM!");
    Serial.println("  SSID: " + wifi_ssid);
  }
}

// ========== ENVIAR DADOS AO SERVIDOR ==========
bool enviarDados() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi não conectado!");
    return false;
  }
  
  HTTPClient http;
  
  // Monta a URL completa
  String url = server_url + "/api/iot/energia";
  
  Serial.print("Enviando dados para: ");
  Serial.println(url);
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  // Monta JSON com dados
  DynamicJsonDocument doc(4096);
  doc["tensao"] = tensao_rede;
  doc["corrente"] = corrente_rms;
  doc["kwh"] = consumoDiario;
  
  JsonArray mensal = doc.createNestedArray("mensal");

  for (int i = 0; i < 31; i++) {
    mensal.add(consumoMensal[i]);
  }

  JsonArray labels = doc.createNestedArray("labels");

  for (String h : historicoHorario) {
    labels.add(h);
  }

  JsonArray dados = doc.createNestedArray("dados");

  for (float v : historicoConsumo) {
    dados.add(v);
  }

  String json;
  serializeJson(doc, json);
  
  Serial.print("JSON: ");
  Serial.println(json);
  
  // Faz POST
  int httpResponseCode = http.POST(json);
  
  if (httpResponseCode == 200) {
    Serial.println("Dados enviados com sucesso!");
    String resposta = http.getString();
    Serial.println("Resposta: " + resposta);
    http.end();
    return true;
  } else {
    Serial.print("Erro na resposta HTTP: ");
    Serial.println(httpResponseCode);
    if (httpResponseCode > 0) {
      Serial.println("Resposta: " + http.getString());
    }
    http.end();
    return false;
  }
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
    Serial.println("\nConectado com sucesso!");
    Serial.print("IP local: ");
    Serial.println(WiFi.localIP());

  
    
    // Desliga o AP quando conectado
    WiFi.softAPdisconnect(true);
    Serial.println("Portal WiFi desativado.");
    
    conectado = true;
  } 
  else 
  {
    Serial.println("\nFalha na conexão!");
    Serial.println("Reabrindo portal de configuração...");
    WiFi.softAP(ssid_ap, password_ap);
  }
}

void setup() {

  analogReadResolution(12);
  analogSetAttenuation(ADC_6db);

  emon1.current(pino_adc, 3.2);           // Corrente: calibração

  Serial.begin(115200);

  pinMode(Reset, INPUT_PULLUP);
  pinMode(pinoRede, INPUT);
  pinMode(led_vd, OUTPUT);
  pinMode(led_vm, OUTPUT);

  redePresente = digitalRead(pinoRede) == (redeAtivaEmHigh ? HIGH : LOW);

  digitalWrite(led_vd, LOW);
  digitalWrite(led_vm, LOW); 

  delay(1000);
  
  Serial.println("\n\n╔══════════════════════════════════╗");
  Serial.println("║  MONITOR DE ENERGIA - ESP32      ║");
  Serial.println("║  SCT013-020 (20A)                ║");
  Serial.println("╚══════════════════════════════════╝\n");
  
  // Inicializa EEPROM
  EEPROM.begin(512);
  
  carregarEstadoEEPROM();

  apagarWiFiEEPROM();
  apagandoWiFiEEPROM();

  // Tenta recuperar credenciais salvas
  lerWiFiEEPROM();
  
  // Se encontrou credenciais, tenta conectar direto
  if (wifi_ssid.length() > 0) {
    Serial.println("Tentando conectar com credenciais salvas...");
    WiFi.mode(WIFI_STA);
    WiFi.begin(wifi_ssid.c_str(), wifi_password.c_str());
    
    int tentativas = 0;
    while (WiFi.status() != WL_CONNECTED && tentativas < 15) {
      delay(500);
      Serial.print(".");
      tentativas++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\nConectado!");
      Serial.print("   IP: ");
      Serial.println(WiFi.localIP());

      configTime(-3 * 3600, 0, "pool.ntp.org");

      ultima_leitura = millis();
      return; // Sucesso, sai do setup
    }
  }
  
  // Se chegou aqui, abre portal de configuração
  Serial.println("Abrindo portal WiFi de configuração...");
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
    
    // Salva Senha na EEPROM para próxima vez
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
  time_t now = time(nullptr);
  struct tm *timeinfo = localtime(&now);

  int diaAtual = timeinfo->tm_mday;

  if (ultimoDia == -1) {
    ultimoDia = diaAtual;
  }

  if (diaAtual != ultimoDia) {

    Serial.println("NOVO DIA DETECTADO!");

    // salva consumo do dia
    consumoMensal[ultimoDia - 1] = consumoDiario;

    // zera consumo diário
    consumoDiario = 0;

    // limpa gráfico diário
    historicoConsumo.clear();
    historicoHorario.clear();

    // atualiza dia
    ultimoDia = diaAtual;

    // persiste o novo estado no fim do dia
    salvarEstadoEEPROM();
  }

  if (WiFi.status() == WL_CONNECTED)
  {
    digitalWrite(led_vm, LOW);
    digitalWrite(led_vd, HIGH);
  } 
  else 
  {
    digitalWrite(led_vm, HIGH);
    digitalWrite(led_vd, LOW);
  }


  // Se em modo AP (portal de configuração ativo)
  if (WiFi.getMode() == WIFI_AP_STA || WiFi.getMode() == WIFI_AP) {
    dnsServer.processNextRequest();
    server.handleClient();
    return;
  }

  bool redeAgora = digitalRead(pinoRede) == (redeAtivaEmHigh ? HIGH : LOW);
  if (redeAgora != redePresente) {
    if (!redeAgora && redePresente && !envioQuedaEnergiaRealizado) {
      Serial.println("[FALHA] Queda de energia detectada.");
      salvarEstadoEEPROM();
      quedaEnergiaPendente = true;
      if (WiFi.status() == WL_CONNECTED) {
        Serial.println("[FALHA] Enviando última leitura ao servidor...");
        if (enviarDados()) {
          envioQuedaEnergiaRealizado = true;
          quedaEnergiaPendente = false;
        }
      } else {
        Serial.println("[FALHA] WiFi não conectado. Último estado salvo na EEPROM.");
      }
    }
    if (redeAgora && !redePresente) {
      Serial.println("[REDE] Energia restaurada.");
      envioQuedaEnergiaRealizado = false;
      quedaEnergiaPendente = false;
    }
    redePresente = redeAgora;
  }
  
  // Se conectado ao WiFi
  if (WiFi.status() == WL_CONNECTED) {
    if (quedaEnergiaPendente && !envioQuedaEnergiaRealizado) {
      Serial.println("[FALHA] Tentando reenviar última leitura pendente...");
      if (enviarDados()) {
        envioQuedaEnergiaRealizado = true;
        quedaEnergiaPendente = false;
      }
    }
    unsigned long agora = millis();
    // Verifica se passou 30 segundos desde última leitura
    if (agora - ultima_leitura >= intervalo_leitura) {
      Serial.println("\n[AÇÃO] Lendo sensor...");
      bool leituraValida = lerSensor();
      
      if (leituraValida) {
        Serial.println("[AÇÃO] Enviando dados ao servidor...");
        enviarDados();
      } else {
        Serial.println("[AÇÃO] Leitura inválida, pulando envio...");
      }
      
      ultima_leitura = agora;
      
      unsigned long proxima = intervalo_leitura / 60000; // Converte para minutos
      Serial.print("Próxima leitura em ");
      Serial.print(proxima);
      Serial.println(" minutos.\n");
    }
      Serial.println(" minutos.\n");
    }
  } else {
    // Perdeu conexão, tenta reconectar
    Serial.println("WiFi desconectado. Tentando reconectar...");
    WiFi.reconnect();
    delay(5000);
  }
  
  delay(100); // Pequena pausa para não sobrecarregar
}

