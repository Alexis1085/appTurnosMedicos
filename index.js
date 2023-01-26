//! App para Turnos Médicos de Alexis Iacusso

const express = require('express');
const app = express();

const mysql = require('mysql2');
const nodemailer = require('nodemailer');
const path = require('path');
const hbs = require('hbs');
const bcrypt = require('bcryptjs'); //Para encriptar en el backend las contraseñas de los usuarios
const dayjs = require('dayjs'); //Dependencia para procesar información de fechas y tiempos
var customParseFormat = require('dayjs/plugin/customParseFormat'); //Plug-in para trabajar con distintos formatos
dayjs.extend(customParseFormat);
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
const session = require('express-session'); //Dependencia para crear sesiones de usuarios
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

//* Función para convertir un String del tipo "dd-mm-yyyy" en Fecha: - No lo uso porque lo implemento con 'dayjs'
/* function string_a_date(element) {
    let pedazos = element.split('-');
    return (new Date(pedazos[2], (pedazos[1] - 1), pedazos[0]));
}; */


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
            for (i=0; i< result_mod.length; i++) {
                result_mod[i].diaSemanaString = "a";
                switch (result_mod[i].diaSemana) {
                    case 1: result_mod[i].diaSemanaString = "lunes";
                        break;
                    case 2: result_mod[i].diaSemanaString = "martes";
                        break;
                    case 3: result_mod[i].diaSemanaString = "miércoles";
                        break;
                    case 4: result_mod[i].diaSemanaString = "jueves";
                        break;
                    case 5: result_mod[i].diaSemanaString = "viernes";
                        break;
                    case 6: result_mod[i].diaSemanaString = "sábado";
                        break;
                };
            };
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
    //! Como uso JQueryUI en el frontend los inputs de fechas en realidad son tipo text. Así que uso la función "string_a_date" declarada arriba al principio para convertir los datos en tipo 'Date':
    //let fechaApertura = string_a_date(req.body.fechaApertura); 
    //let fechaCierre = string_a_date(req.body.fechaCierre);
    // No lo uso porque lo implemento con 'dayjs'
    let fechaApertura = new Date(dayjs(req.body.fechaApertura, "DD-MM-YYYY"));
    let fechaCierre = new Date(dayjs(req.body.fechaCierre, "DD-MM-YYYY"));
    fechaCierre.setHours(23,59);
    //console.log(fechaApertura, fechaCierre);
    //! Query para traer los datos del Módulo de la tabla modulos. "horaInicio" lo transformo en tipo String con "CAST()" para poder usar la función 'split':
    conexion.query(`SELECT diaSemana, CAST(horaInicio AS CHAR(5)) AS horaInicio, duracion, cantidadTurnos FROM modulos WHERE idModulo = ${req.body.idModulo};`, (err,result) => {
        if (err) throw err;
        console.log(result);
        //! Creo la variable "auxDate" que irá almacenando los valores parciales de los turnos, en fecha y hora:
        let auxDate = fechaApertura;
        let pedacitos = result[0].horaInicio.split(":");
        auxDate.setHours(pedacitos[0]-3, pedacitos[1]);
        console.log(auxDate);
        /*
        ! do{ if ( for() ) }while Algoritmo que toma el díaSemana del Módulo y lo compara con el dia de auxDate (inicialmente igual a fechaApertura):
        * Si coinciden lo usa como fecha para insertar en la base de datos, luego auxDate se setea como 7 días después, se fija si no es mayor a fechaCierre y también lo inserta. Así hasta que sea mayor a fechaCierre. 
        * Si no coinciden setea auxDate como fechaApertura +1 y vuelve a comparar hasta que coicidan */
        do {
            if (auxDate.getDay() == result[0].diaSemana) {
                //! Creo la variable "turnos" tipo 'Date' y con el formato apropiado para insertar los valores en la base de datos:
                let turnos = new Date;
                for (j=0; j< result[0].cantidadTurnos; j++) {
                    turnos = dayjs(auxDate).format('YYYYMMDDHHmmss'); //Los datos tipo 'Date' no son como los String o Number. Cuando se asignan con '=' en realidad se referencian y no se copian. Para hacer una copia podía hacer lo siguiente: "turnos[0].setTime(auxDate.getTime())" Yo usé la dependencia 'dayjs' porque ya la había instalado y porque me permite ajustar el formato para poder acer luego el INSERT a la Base de Datos. De la otra forma no lo podía hacer porque el formato en el que quedaba turnos no me lo permitía.
                    conexion.query(`INSERT INTO turnos (idModulo, turno) VALUES(${req.body.idModulo}, ${turnos});`, err => {if (err) throw err;}); //En la base de datos la hora de los turnos queda guardada como -3 horas por el huso horario. Luego cuando hago el SELECT viene la hora correcta.
                    auxDate.setMinutes(auxDate.getMinutes() + result[0].duracion);
                }
                auxDate.setDate(auxDate.getDate() +7)
                auxDate.setHours(pedacitos[0]-3, pedacitos[1]);
                //console.log(auxDate);
            } else {
                auxDate.setDate(auxDate.getDate() +1)
                //console.log(auxDate);
            }
        } while (auxDate <= fechaCierre);
    })
    res.redirect('/panelmedico');
});

app.listen(port, () => {
    console.log(`Servidor conectado al Puerto ${port}`);
});

//TODO Panel de los médicos ---> Agenda

//TODO Desarrollar el panel de los pacientes ---> (Perfil) // Buscador // Mis turnos