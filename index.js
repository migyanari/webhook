const express = require("express");
const app = express();
const {
    WebhookClient
} = require("dialogflow-fulfillment");

app.get("/", function (req, res) {
    res.sendFile('index.html', {
        root: __dirname
    });
});

app.post("/webhook", express.json(), function (req, res) {
    const agent = new WebhookClient({
        request: req,
        response: res
    });
    console.log("Dialogflow Request headers: " + JSON.stringify(req.headers));
    console.log("Dialogflow Request body: " + JSON.stringify(req.body));

    function welcome(agent) {
        agent.add(`Welcome to my agent!`);
    }

    function fallback(agent) {
        agent.add(`No te he entendido`);
        agent.add(`Lo siento, ¿podrías intentarlo de nuevo?`);
    }

    const mysql = require('mysql');

    function connectToDatabase() {
        console.log("Reacciona")
        const connection = mysql.createConnection('mysql://u3ri0m3dk7su3ssz:tBQvj7vWjPzjjJPrubJ4@bv2vbj4xqvqxzfbawivc-mysql.services.clever-cloud.com:3306/bv2vbj4xqvqxzfbawivc');
        console.log(connection);

        return new Promise((resolve, reject) => {
            connection.connect();
            resolve(connection);
            console.log(connection);
        });
    }

    function queryDatabase(connection) {
        return new Promise((resolve, reject) => {
            connection.query("SELECT * from `vets`", (error, results, fields) => {
                resolve(results);
            });
        });
    }

    function handleListFromMySQL(agent) {
        return connectToDatabase()
            .then(connection => {
                return queryDatabase(connection)
                    .then(result => {
                        console.log(result)
                        agent.add("A continuación tienes una lista con todos los veterinarios:")
                        let i = 1;
                        let lista = "";
                        result.forEach(vet => {
                            lista = lista.concat('', i + ". " + vet.first_name + " " + vet.last_name + '\n');
                            i++;
                        });
                        agent.add(lista)
                        connection.end();
                    });
            });
    }

    function handleSearchFromMySQL(agent) {
        const user_name = agent.parameters.nombre;
        return connectToDatabase()
            .then(connection => {
                return queryDatabase(connection)
                    .then(result => {
                        console.log(result)
                        agent.add("Veterinarios encontrados:");
                        let i = 1;
                        let lista = "";
                        result.forEach(vet => {
                            if (user_name.name == vet.first_name) {
                                lista = lista.concat('', i + ". " + vet.first_name + " " + vet.last_name + '\n');
                                i++;
                            }
                        });
                        agent.add(lista)
                        connection.end();
                    });
            });
    }

    function insertIntoDatabase(connection, data) {
        return new Promise((resolve, reject) => {
            connection.query('INSERT INTO vets SET ?', data, (error, results, fields) => {
                resolve(results);
            });
        });
    }

    function handleWriteIntoMySQL(agent) {
        const data = {
            first_name: agent.parameters.nombre.name,
            last_name: agent.parameters.apellidos.name
        };
        console.log(data)
        return connectToDatabase()
            .then(connection => {
                return insertIntoDatabase(connection, data)
                    .then(result => {
                        agent.add('Añadido al veterinario ' + data.first_name + " " + data.last_name);
                        connection.end();
                    });
            });
    }

    function updateDatabase(connection, data) {
        return new Promise((resolve, reject) => {
            connection.query(`UPDATE vets SET ? WHERE last_name = ?`, [data, data.last_name], (error, results, fields) => {
                resolve(results);
            });
        });
    }

    function handleUpdateMySQL(agent) {
        const data = {
            first_name: agent.parameters.nombre.name,
            last_name: agent.parameters.apellidos.name
        };
        return connectToDatabase()
            .then(connection => {
                return updateDatabase(connection, data)
                    .then(result => {
                        agent.add('El veterinario ahora es ' + data.first_name + " " + data.last_name);
                        connection.end();
                    });
            });
    }

    function deleteFromDatabase(connection, last_name) {
        return new Promise((resolve, reject) => {
            connection.query(`DELETE from vets WHERE last_name = ?`, last_name, (error, results, fields) => {
                resolve(results);
            });
        });
    }

    function handleDeleteFromMySQL(agent) {
        const last_name = agent.parameters.apellidos.name;
        return connectToDatabase()
            .then(connection => {
                return deleteFromDatabase(connection, last_name)
                    .then(result => {
                        agent.add('Eliminado el veterinario con el apellido ' + last_name);
                        connection.end();
                    });
            });
    }

    let intentMap = new Map();
    intentMap.set("Default Welcome Intent", welcome);
    intentMap.set("Default Fallback Intent", fallback);
    intentMap.set("listVets", handleListFromMySQL);
    intentMap.set("searchVet", handleSearchFromMySQL);
    intentMap.set('addVet', handleWriteIntoMySQL);
    intentMap.set('updateVet', handleUpdateMySQL);
    intentMap.set('deleteVet', handleDeleteFromMySQL);
    agent.handleRequest(intentMap);
});

let port = 3000;
app.listen(port, () => {
    console.log("Estamos ejecutando el servidor en el puerto " + port);
});