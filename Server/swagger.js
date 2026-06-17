const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VoltSense API',
      version: '1.0.0',
      description: 'API de monitoramento inteligente de energia elétrica'
    },
    servers: [
      {
        url: 'http://191.252.100.171:3000'
      }
    ]
  },
  components: {
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT'
    }
  }
},
  apis: ['./index.js']
};

module.exports = swaggerJsdoc(options);