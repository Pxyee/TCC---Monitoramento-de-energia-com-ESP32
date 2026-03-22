# TCC---Monitoramento-de-energia-com-ESP32

Fluxo de integração com ESP32

1. ESP32 lê sensor SCT013
2. envia POST para `http://IP_SERVIDOR:3000/api/energia`
3. Node salva no MySQL
4. Dashboard busca `/api/leituras`


