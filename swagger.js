const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'Insight Engine API',
    description: 'Auto-generated Swagger documentation'
  },
  host: process.env.SWAGGER_HOST,
  schemes: ['http','https'],
};

const outputFile = './swagger-output.json';
const routes = ['./index.js']; 

swaggerAutogen(outputFile, routes, doc);
