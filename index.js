//! App para Turnos Médicos de Alexis Iacusso

const express = require('express');
const app = express();

const mysql = require('mysql2');
const nodemailer = require('nodemailer');
const path = require('path');
const hbs = require('hbs');
require('dotenv').config();
/* Formato de las variables de entorno:
SERVER_PORT=
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=
EMAIL=
EMAIL_PASS=
*/

const port = process.env.SERVER_PORT || 9000;

//* Middlewares:
app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(express.static(path.join(__dirname, 'public')));

//* Configuración del Motor de Plantillas HBS:
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
hbs.registerPartials(path.join(__dirname, 'views/partials'));

//* Conexión a la Base de Datos:
const conexion = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});
conexion.connect(err => {
    if (err) throw err;
    console.log(`Conectado a la base de datos ${process.env.DB_NAME}`);
});

//* Rutas de la Aplicación:




app.listen(port, () => {
    console.log(`Servidor conectado al Puerto ${port}`);
});