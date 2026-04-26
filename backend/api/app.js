const express = require("express");
const healthRouter = require("./routes/health");

const app = express();

app.use(express.json());
app.get("/", (_req, res) => {
	res.status(200).json({ status: "ok", service: "backend" });
});
app.use("/health", healthRouter);

module.exports = app;
