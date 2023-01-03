-- Script para crear la Base de Datos de la APP para Turnos Médicos de Alexis Iacusso --
create database turnosmedicos;

use turnosmedicos;

-- Creación de la tabla para la entidad "Médicos": --
create table medicos (
usuarioMedico varchar(8) not null unique,
passMedico varchar(14) not null,
nombreMedico varchar(25) not null,
apellidoMedico varchar(50) not null,
especialidad varchar(50) not null,
resena varchar(1000),
primary key (usuarioMedico)
);

-- Creación de la tabla de la entidad "Obras Sociales": --
create table obrasSociales (
idOS int unsigned zerofill auto_increment not null,
usuarioMedico varchar(8) not null unique,
osecac bool,
osde bool,
swiss bool,
prevencion bool,
pami bool,
primary key (idOS),
foreign key (usuarioMedico) references medicos(usuarioMedico)
);

-- Creación de la tabla de la entidad "Modulos de Consultorios": --
create table modulos (
idModulo int unsigned zerofill not null auto_increment,
calle varchar(100) not null,
ciudad varchar(50) not null,
provincia varchar(30) not null,
diaSemana varchar(10) not null,
horaInicio time not null,
duracion int unsigned not null,
cantidadTurnos int unsigned not null,
usuarioMedico varchar(8) not null,
primary key (idModulo),
foreign key (usuarioMedico) references medicos(usuarioMedico)
);

-- Creación de la tabla para la entidad "Pacientes": --
create table pacientes (
usuarioPaciente varchar(8) not null unique,
passPaciente varchar(14) not null,
nombrePaciente varchar(25) not null,
apellidoPaciente varchar(50) not null,
fechaNacimiento date not null,
telefono varchar(20) not null,
email varchar(50) not null,
obraSocial varchar(20),
primary key (usuarioPaciente)
);

-- Creación de la tabla de la entidad "Turnos": --
create table turnos (
idTurno int unsigned zerofill not null auto_increment,
idModulo int unsigned zerofill not null,
dia date not null,
hora time not null,
usuarioPaciente varchar(8),
primary key (idTurno),
foreign key (idModulo) references modulos(idModulo),
foreign key (usuarioPaciente) references pacientes(usuarioPaciente)
);