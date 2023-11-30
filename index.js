import express from "express";
import cors from "cors";
import singsRoutes from "./routes/signs.js";
import avatarsRoutes from "./routes/avatar.js";
import videosRoutes from "./routes/videos.js";
import chartsRoutes from "./routes/charts.js";
import { pool } from "./database/databasePool.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use("/api/signs", singsRoutes);
app.use("/api/avatars", avatarsRoutes);
app.use("/api/videos", videosRoutes);
app.use("/api/charts", chartsRoutes);

app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

pool.getConnection((err, connection) => {
    if (err) {
        console.log('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
    pool.releaseConnection(connection); // 释放连接，以便下次使用
});

app.listen(3030, () => {
    console.log("Server is listening on port 3030");
});