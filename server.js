const express = require("express");
const config = require("./config/config");
const logger = require("./utils/logger");
const allRoutes = require("./routes");
const { scheduleWatchRenewal } = require("./jobs/watchRenewalJob");

const app = express();
const PORT = config.server.port;

app.use(express.json({}));

app.use((req, res, next) => {
    logger.info(`Request Received: ${req.method} ${req.originalUrl}`);
    res.on("finish", () => {
        logger.info(
            `Request Finished: ${res.statusCode} ${req.method} ${req.originalUrl}`
        );
    });
    next();
});

app.use("/", allRoutes);

app.use((err, req, res, next) => {
    logger.error("Unhandled Error:", err);

    const statusCode = err.statusCode || 500;
    const message =
        process.env.NODE_ENV === "production" && statusCode === 500
            ? "Internal Server Error"
            : err.message || "An unexpected error occurred";

    res.status(statusCode).json({
        status: "error",
        statusCode: statusCode,
        message: message,
    });
});

app.listen(PORT, () => {
    logger.info(`Server listening on port ${PORT}`);
    logger.info(
        `Visit http://localhost:${PORT}/ to check status and authenticate.`
    );
    logger.info(`Attachments will be saved to: ${config.attachmentsDir}`);
    logger.info(`Using token storage: ${config.storage.tokenPath}`);
    logger.info(`Using state storage: ${config.storage.statePath}`);

    scheduleWatchRenewal();
});

process.on("SIGTERM", () => {
    logger.info("SIGTERM signal received: closing HTTP server");
    process.exit(0);
});

process.on("SIGINT", () => {
    logger.info("SIGINT signal received: closing HTTP server");
    process.exit(0);
});
