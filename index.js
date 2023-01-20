//! App para Turnos Médicos de Alexis Iacusso

const express = require('express');
const app = express();

const mysql = require('mysql2');
const nodemailer = require('nodemailer');
const path = require('path');
const hbs = require('hbs');
const bcrypt = require('bcryptjs');
const dayjs = require('dayjs');
require('dotenv').config();
/* Formato de las variables de entorno:
SESSION_SECRET=
PORT=
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

const port = process.env.PORT || 9000;

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
    //console.log(`Conectado a la base de datos ${process.env.DB_NAME}`);
});

//*Creación de Variables globales para el funcionamiento de la app
let listaObrasSociales;
conexion.query("SELECT * FROM obras_sociales;", (err,result) => {
    if (err) throw err;
    //console.log(result);
    listaObrasSociales = result;
});

//* Función para convertir un String del tipo "dd-mm-yyyy" en Fecha:
function string_a_date(element) {
    let pedazos = element.split('-');
    return (new Date(pedazos[2], (pedazos[1] - 1), pedazos[0]));
};


//* Rutas de la Aplicación:

app.get('/', (req,res) => {
    res.render('home', {
        datosObrasSociales: listaObrasSociales
    });
});

app.get('/panelmedico', (req,res) => {
    if (req.session.loggedin && req.session.rol == 'medico'){
        //*SELECT para traer los datos de la tabla modulos
        conexion.query(`SELECT * FROM modulos WHERE usuarioMedico = '${req.session.datosMedico.usuarioMedico}';`, (err,result_mod) => {
            if (err) throw err;
            //console.log(result_mod);
            //* SELECT para traer los datos necesarios para la Solapa Obras Sociales
            conexion.query(`SELECT os.idOS, os.nombreObraSocial, osmed.usuarioMedico FROM obras_sociales AS os LEFT JOIN (
                SELECT * FROM os_medicos WHERE usuarioMedico = '${req.session.datosMedico.usuarioMedico}'
            ) AS osmed ON os.idOS = osmed.idOS;`, (err,result_os) => {
                if (err) throw err;
                let osMedico = result_os;
                osMedico.map(function(aux) {
                    if (aux.usuarioMedico == null){
                        aux.usuarioMedico = false;
                    } else {
                        aux.usuarioMedico = true;
                    }
                    return aux;
                });
                res.render('panelmedico', {
                    datosMedico: req.session.datosMedico,
                    datosObrasSociales: osMedico,
                    datosModulos: result_mod
                })
            })
        })
    } else {
        res.redirect('/');
    }
});

app.get('/panelpaciente', (req,res) => {
    if (req.session.loggedin && req.session.rol == 'paciente'){
        res.render('panelpaciente', {
            datosPaciente: req.session.datosPaciente,
            datosObrasSociales: listaObrasSociales
        })
    } else {
        res.redirect('/');
    }
});

app.get('/logout', (req,res) => {
    req.session.destroy(() => {
        res.redirect('/');
    })
});

//? POST para el registro de nuevos médicos
app.post('/nuevoMedico', async (req,res) => {
    //console.log(req.body);
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
        //console.log(`1 nuevo Médico agregado a la Base de Datos`);
        req.session.loggedin = true;
        req.session.rol = 'medico';
        conexion.query(`SELECT * FROM medicos WHERE usuarioMedico = '${datosNuevoMedico.usuarioMedico}';`, (err,result) => {
            if (err) throw err;
            req.session.datosMedico = result[0];
            res.redirect('/panelmedico')
        })    
    })    
});    

//? POST para el registro de nuevos pacientes
app.post('/nuevoPaciente', async (req,res) => {
    //console.log(req.body);
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
        //console.log(`1 nuevo usuario agregado a la base de datos`);
        req.session.loggedin = true;
        req.session.rol = 'paciente';
        conexion.query(`SELECT p.usuarioPaciente, p.passPaciente, p.nombrePaciente, p.apellidoPaciente, p.fechaNacimiento, p.telefono, p.email, os.nombreObraSocial FROM pacientes AS p INNER JOIN obras_sociales AS os ON p.idOS = os.idOS WHERE usuarioPaciente = '${datosNuevoPaciente.usuarioPaciente}';`, (err,result) => {
            if (err) throw err;
            result[0].fechaNacimiento = dayjs(result[0].fechaNacimiento).format('YYYY-MM-DD');
            req.session.datosPaciente = result[0];
            res.redirect('/panelpaciente');
        })    
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
            //console.log("Login correcto");
            req.session.loggedin = true;
            req.session.rol = 'medico';
            req.session.datosMedico = result[0];
            res.redirect('/panelmedico');
        }        
    })    
});    

//? POST para el "log in" de los pacientes
app.post('/loginpaciente', async (req,res) => {
    let usuario = req.body.loginUsuarioPaciente;
    let password = req.body.loginPassPaciente;
    let hashPassword = await bcrypt.hash(password, 8); //? Para qué hashea el password que viene si después no lo usa para la comparación?
    conexion.query(`SELECT p.usuarioPaciente, p.passPaciente, p.nombrePaciente, p.apellidoPaciente, p.fechaNacimiento, p.telefono, p.email, os.nombreObraSocial FROM pacientes AS p INNER JOIN obras_sociales AS os ON p.idOS = os.idOS WHERE usuarioPaciente = '${usuario}';`, async (err,result) => {
        if (err) {
            console.log(err);
            res.send("Error de conexión");
        } else if (result.length == 0 || !(await bcrypt.compare(password, result[0].passPaciente))) {
            res.send('<h4>Usuario y/o contraseña incorrectos</h4><a href="/">Volver</a>');
        } else {
            //console.log("Login correcto");
            result[0].fechaNacimiento = dayjs(result[0].fechaNacimiento).format('YYYY-MM-DD');
            //console.log(result);
            req.session.loggedin = true;
            req.session.rol = 'paciente';
            req.session.datosPaciente = result[0];
            res.redirect('/panelpaciente')
        }        
    })    
});    

//? POST para la actualización del Perfil de los médicos:
app.post('/actualizarMedico', (req,res) => {
    let updateMedico = {
        nombreMedico: req.body.nombreMedico,
        apellidoMedico: req.body.apellidoMedico,
        especialidad: req.body.especialidad,
        resena: req.body.resena
    };
    conexion.query(`UPDATE medicos SET ? WHERE usuarioMedico = "${req.session.datosMedico.usuarioMedico}";`, updateMedico, err => {
        if (err) throw err;
        //console.log("Medico actualizado");
        conexion.query(`SELECT * FROM medicos WHERE usuarioMedico = "${req.session.datosMedico.usuarioMedico}";`, (err,result) => {
            if (err) throw err;
            req.session.datosMedico = result[0];
            res.redirect('/panelmedico')
        })
    })
});

//? POST para la actualización del Perfil de los pacientes:
app.post('/actualizarpaciente', (req,res) => {
    let updatePaciente = {
        nombrePaciente: req.body.nombrePaciente,
        apellidoPaciente: req.body.apellidoPaciente,
        fechaNacimiento: req.body.fechaNacimiento,
        telefono: req.body.telefono,
        email: req.body.email,
        idOS: req.body.obraSocial
    };
    conexion.query(`UPDATE pacientes SET ? WHERE usuarioPaciente = "${req.session.datosPaciente.usuarioPaciente}";`, updatePaciente, err => {
        if (err) throw err;
        //console.log("Paciente actualizado");
        conexion.query(`SELECT p.usuarioPaciente, p.passPaciente, p.nombrePaciente, p.apellidoPaciente, p.fechaNacimiento, p.telefono, p.email, os.nombreObraSocial FROM pacientes AS p INNER JOIN obras_sociales AS os ON p.idOS = os.idOS WHERE usuarioPaciente = "${req.session.datosPaciente.usuarioPaciente}";`, (err,result) => {
            if (err) throw err;
            result[0].fechaNacimiento = dayjs(result[0].fechaNacimiento).format('YYYY-MM-DD');
            req.session.datosPaciente = result[0];
            res.redirect('/panelpaciente')
        })
    })
});

//? POST para el CRUD de la tabla "os_medicos" que define qué Obra Social atiende cada médico:
app.post('/os_medicos', (req,res) => {
    //console.log(req.body);
    let osNuevas = req.body.idOS;
    //console.log(osNuevas);
    conexion.query(`SELECT idOS FROM os_medicos WHERE usuarioMedico = '${req.session.datosMedico.usuarioMedico}' ORDER BY idOS ASC;`, (err,result) => {
        if (err) throw err;
        //console.log(result);
        let osExistentes = result;
        //Algoritmo para agregar las Nuevas Obras Sociales que eligió el médico
        for (var i=0; i< osNuevas.length; i++) {
            var existe = false;
            for (var j=0; j< osExistentes.length; j++) {
                if (osNuevas[i] == osExistentes[j].idOS) {
                    existe = true;
                    break;
                }
            } if (!existe) {
                conexion.query(`INSERT INTO os_medicos (usuarioMedico, idOS) VALUES(${req.session.datosMedico.usuarioMedico},${osNuevas[i]});`, err => {if (err) throw err;});
            }
        }
        //Algoritmo para Eliminar las Obras Sociales que ya no elige
        for (var j=0; j< osExistentes.length; j++) {
            var continua = false;
            for (var i=0; i< osNuevas.length; i++) {
                if (osExistentes[j].idOS == osNuevas[i]) {
                    continua = true;
                    break;
                }
            } if (!continua) {
                conexion.query(`DELETE FROM os_medicos WHERE usuarioMedico = ${req.session.datosMedico.usuarioMedico} AND idOS = ${osExistentes[j].idOS};`, err => {if (err) throw err;});
            }
        }
    });
    res.redirect('/panelmedico');
})

//? POST para Insertar datos en la tabla Módulos:
app.post('/nuevomodulo', (req,res) => {
    //console.log(req.body);
    let datosNuevoModulo = {
        calle: req.body.calle,
        ciudad: req.body.ciudad,
        provincia: req.body.provincia,
        diaSemana: req.body.diaSemana,
        horaInicio: req.body.horaInicio,
        duracion: req.body.duracion,
        cantidadTurnos: req.body.cantidadTurnos,
        usuarioMedico: req.session.datosMedico.usuarioMedico
    };
    conexion.query(`INSERT INTO modulos SET ?;`, datosNuevoModulo, err => {
        if (err) throw err;
        res.redirect('/panelmedico');
    })
});

//? POST para Modificar datos en la tabla Módulos:
app.post('/updatemodulo', (req,res) => {
    let datosUpdateModulo = {
        calle: req.body.calle,
        ciudad: req.body.ciudad,
        provincia: req.body.provincia,
        diaSemana: req.body.diaSemana,
        horaInicio: req.body.horaInicio,
        duracion: req.body.duracion,
        cantidadTurnos: req.body.cantidadTurnos,
    };
    conexion.query(`UPDATE modulos SET ? WHERE idModulo = ${req.body.idModulo};`, datosUpdateModulo, err => {
        if (err) throw err;
        res.redirect('/panelmedico');
    })
});

//? POST para Eliminar Módulos:
app.post('/deletemodulo', (req,res) => {
    //console.log(req.body);
    conexion.query(`DELETE FROM modulos WHERE idModulo = ${req.body.idModulo};`, err => {
        if (err) throw err;
        res.redirect('/panelmedico');
    })
});

//? POST para Abrir Agenda y crear los turnos:
app.post('/abriragenda', (req,res) => {
    console.log(req.body);
    let fechaApertura = string_a_date(req.body.fechaApertura);
    let fechaCierre = string_a_date(req.body.fechaCierre);
    let diaApertura = fechaApertura.getDay();
    let diaCierre = fechaCierre.getDay();
    
    let auxDate;
    do for() while /*Algoritmo que tome el díaSemana del Módulo y lo compare con diaApertura:
    * Si coincide lo use como día para insertar en la base de datos, luego auxDate se setee como 7 días después, se fije si no es mayor a fechaCierre y tamién lo inserte, etc. hasta que sea mayor a fechaCierre. 
    * Si no coincide setear auxDate como diaApertura +1 y volver a comparar hasta que coicidan */
    console.log(range);
    console.log(diaApertura, diaCierre);
    res.redirect('/panelmedico');
});

app.listen(port, () => {
    console.log(`Servidor conectado al Puerto ${port}`);
});

//TODO Panel de los médicos ---> Agenda

//TODO Desarrollar el panel de los pacientes ---> (Perfil) // Buscador // Mis turnos