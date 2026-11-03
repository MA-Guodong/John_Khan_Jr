import mysql from 'mysql2';

export const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'John_Khan_Jr',
    waitForConnections: true,
    connectionLimit: 15,
    maxIdle: 15, // max idle connections, the default value is the same as `connectionLimit`
    idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});