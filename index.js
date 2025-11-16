require("dotenv").config();
const express = require("express");
const app = express();
const connectDB = require("./config/db");
const insightsRoute = require("./routes/insightsRoute");
const analyticsRoute = require("./routes/analytics");
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./swagger-output.json');

app.use(express.json());

// Connect DB
connectDB();
app.use(express.static("public"));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));


// Routes
app.use("/api/insights", insightsRoute);
app.use("/api/analytics", analyticsRoute);

app.get("/", (req, res) => res.send("Insight Engine is running"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Insight Engine listening on port ${PORT}`));