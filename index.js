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

//*Creación de Variables globales para el funcionamiento de la app
let listaObrasSociales;
conexion.query("SELECT * FROM obrasSociales", (err,result) => {
    if (err) throw err;
    console.log(result);
    listaObrasSociales = result;
});
 
//* Rutas de la Aplicación:
//? POST para el registro de nuevos médicos
app.post('/nuevoMedico', (req,res) => {
    console.log(req.body);
    let datosNuevoMedico = {
        usuarioMedico: req.body.usuarioMedico,
        passMedico: req.body.passMedico,
        nombreMedico: req.body.nombreMedico,
        apellidoMedico: req.body.apellidoMedico,
        especialidad: req.body.especialidad,
        resena: req.body.resena
    };
    conexion.query("INSERT INTO medicos SET ?", datosNuevoMedico, err => {
        if (err) throw err;
        console.log(`1 nuevo Médico agregado a la Base de Datos`);
        res.send(`Hola Doctor@ ${datosNuevoMedico.apellidoMedico}! Usted fue agregado a la base de datos de la app`);
    })
});

app.post('/nuevoPaciente', (req,res) => {
    console.log(req.body);
    let datosNuevoPaciente = {
        usuarioPaciente: req.body.usuarioPaciente,
        passPaciente: req.body.passPaciente,
        nombrePaciente: req.body.nombrePaciente,
        apellidoPaciente: req.body.apellidoPaciente,
        fechaNacimiento: req.body.fechaNacimiento,
        telefono: req.body.telefono,
        email: req.body.email,
        idOS: req.body.obraSocial
    };
    conexion.query("INSERT INTO pacientes SET ?", datosNuevoPaciente, err => {
        if (err) throw err;
        console.log(`1 nuevo usuario agregado a la base de datos`);
        res.send(`Hola ${datosNuevoPaciente.nombrePaciente}, fuiste agregad@ a la base de datos`);
    })
})

app.get('/', (req,res) => {
    res.render('home', {
        datosObrasSociales: listaObrasSociales
    });
});

app.listen(port, () => {
    console.log(`Servidor conectado al Puerto ${port}`);
});

//TODO Login trucho.