//! App para Turnos Médicos de Alexis Iacusso

const express = require('express');
const app = express();

const mysql = require('mysql2');
const nodemailer = require('nodemailer');
const path = require('path');
const hbs = require('hbs');
const bcrypt = require('bcryptjs');
require('dotenv').config();
/* Formato de las variables de entorno:
SESSION_SECRET=
SERVER_PORT=
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=
EMAIL=
EMAIL_PASS=
*/
const session = require('express-session');
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

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
conexion.query("SELECT * FROM obras_sociales;", (err,result) => {
    if (err) throw err;
    console.log(result);
    listaObrasSociales = result;
});

//* Rutas de la Aplicación:
//? POST para el registro de nuevos médicos
app.post('/nuevoMedico', async (req,res) => {
    console.log(req.body);
    let passMedico = req.body.passMedico;
    let hashPassMedico = await bcrypt.hash(passMedico, 8);
    let datosNuevoMedico = {
        usuarioMedico: req.body.usuarioMedico,
        passMedico: hashPassMedico,
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

//? POST para el registro de nuevos pacientes
app.post('/nuevoPaciente', async (req,res) => {
    console.log(req.body);
    let passPaciente = req.body.passPaciente;
    let hashPassPaciente = await bcrypt.hash(passPaciente, 8);
    let datosNuevoPaciente = {
        usuarioPaciente: req.body.usuarioPaciente,
        passPaciente: hashPassPaciente,
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

//? POST para el "log in" de los médicos
app.post('/loginmedico', async (req,res) => {
    let usuario = req.body.loginUsuarioMedico;
    let password = req.body.loginPassMedico;
    let hashPassword = await bcrypt.hash(password, 8); //? Para qué hashea el password que viene si después no lo usa para la comparación?
    conexion.query(`SELECT * FROM medicos WHERE usuarioMedico = '${usuario}';`, async (err,result) => {
        if (err) {
            console.log(err);
            res.send("Error de conexión");
        } else if (result.length == 0 || !(await bcrypt.compare(password, result[0].passMedico))) {
            res.send('<h4>Usuario y/o contraseña incorrectos</h4><a href="/">Volver</a>');
        } else {
            console.log("Login correcto");
            req.session.loggedin = true;
            req.session.rol = 'medico';
            req.session.datosMedico = result[0]
            res.render('panelmedico', {
                //login: true,
                datosMedico: req.session.datosMedico
                })
        }
    })
});

//? POST para el "log in" de los pacientes
app.post('/loginpaciente', async (req,res) => {
    let usuario = req.body.loginUsuarioPaciente;
    let password = req.body.loginPassPaciente;
    let hashPassword = await bcrypt.hash(password, 8); //? Para qué hashea el password que viene si después no lo usa para la comparación?
    conexion.query(`SELECT * FROM pacientes WHERE usuarioPaciente = '${usuario}';`, async (err,result) => {
        if (err) {
            console.log(err);
            res.send("Error de conexión");
        } else if (result.length == 0 || !(await bcrypt.compare(password, result[0].passPaciente))) {
            res.send('<h4>Usuario y/o contraseña incorrectos</h4><a href="/">Volver</a>');
        } else {
            console.log("Login correcto");
            req.session.loggedin = true;
            req.session.rol = 'paciente';
            req.session.datosPaciente = result[0];
            res.render('panelpaciente', {
                //login: true,
                datosPaciente: req.session.datosPaciente
                })
        }
    })
});


app.get('/', (req,res) => {
    res.render('home', {
        datosObrasSociales: listaObrasSociales
    });
});

app.get('/panelmedico', (req,res) => {
    if (req.session.loggedin && req.session.rol == 'medico'){
        res.render('panelmedico', {
            //login: true,
            datosMedico: req.session.datosMedico
        })
    } else {
        res.render('home', {
            //login: false,
            datosObrasSociales: listaObrasSociales
        })
    }
});

app.get('/panelpaciente', (req,res) => {
    if (req.session.loggedin && req.session.rol == 'paciente'){
        res.render('panelpaciente', {
            //login: true,
            datosPaciente: req.session.datosPaciente
        })
    } else {
        res.render('home', {
            //login: false,
            datosObrasSociales: listaObrasSociales
        })
    }
});

app.get('/logout', (req,res) => {
    req.session.destroy(() => {
        res.redirect('/');
    })
});


app.listen(port, () => {
    console.log(`Servidor conectado al Puerto ${port}`);
});

//TODO Empezar a desarrollar el panel de los médicos ---> Perfil // Obras Sociales // Módulos // Agenda

//TODO Desarrollar el panel de los pacientes ---> Perfil // Buscador // Mis turnos