const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ChopNow API',
      version: '1.0.0',
      description: 'API documentation for the ChopNow food rescue platform',
      contact: {
        name: 'ChopNow Support',
        email: 'chopnow.app@gmail.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Local Development Server',
      },
      {
        url: 'https://chopnow-backend.onrender.com/api',
        description: 'Production Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./routes/*.js'], // Files containing annotations
};

const specs = swaggerJsdoc(options);

module.exports = specs;
