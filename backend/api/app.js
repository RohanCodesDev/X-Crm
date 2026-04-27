const express = require("express");
const healthRouter = require("./routes/health");
const crmRouter = require("./routes/crm");
const authRouter = require("./routes/auth");

const app = express();

app.use((req, res, next) => {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

	if (req.method === "OPTIONS") {
		return res.status(204).end();
	}

	return next();
});

app.use(express.json());
app.get("/", (_req, res) => {
	res.status(200).json({ status: "ok", service: "backend" });
});
app.use("/health", healthRouter);
app.use("/auth", authRouter);
app.use("/crm", crmRouter);

module.exports = app;
