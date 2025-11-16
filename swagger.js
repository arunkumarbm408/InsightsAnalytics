const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'Insight Engine API',
    description: 'Auto-generated Swagger documentation'
  },
  host: 'localhost:5000',
  schemes: ['http','https'],
};

const outputFile = './swagger-output.json';
const routes = ['./index.js']; 

swaggerAutogen(outputFile, routes, doc);
