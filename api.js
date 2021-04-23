import express from "express";
import winston from "winston";
import fs from "fs";
import { promisify } from "util";


const { combine, timestamp, label, printf } = winston.format;

const myFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
})

global.logger = winston.createLogger({
    level: 'silly',
    transports: [
        new (winston.transports.Console)(),
        new (winston.transports.File)({ filename: `my-bank-api.log` })
    ],
    format: combine(
        label({ label: `my-bank-api` }),
        timestamp(),
        myFormat
    )
});

const api = express();
const exists = promisify(fs.exists);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);


global.filename = 'accounts.json';


api.use(express.json());


api.post("/account", async (req, res) => {
    try {
        let account = req.body;
        const data = JSON.parse(await readFile(global.filename, 'utf8'));
        account = { id: data.nextId++, ...account, timestamp: new Date() };  
        data.accounts.push(account);
        await writeFile(global.filename, JSON.stringify(data));
        
        res.end();

        logger.info(`POST /account : ${JSON.stringify(data)} `);
    } catch (error) {
        res.status(400).send({ error: error.message});
        logger.error(`error.message: ${error.message}`);    
    }
});

api.get("/account", async (req, res) => {
    try {
        const data = JSON.parse(await readFile(global.filename, 'utf8'));
        delete data.nextId;

        res.send(data);

        logger.info(`GET /account : ${JSON.stringify(data)} `);       
    } catch (error) {
        res.status(400).send({ error: error.message});
        logger.error(`error.message: ${error.message}`);     
    }
});

api.get("/account/saldo/:id", async (req, res) => {
    try {
        const data = JSON.parse(await readFile(global.filename, 'utf8'));
        const account = data.accounts.find(account => account.id === parseInt(req.params.id, 10));
        
        if(account){
            const balanceReturn = {balance: account.balance};
            res.send(balanceReturn);

            logger.info(`GET /account/saldo : ${JSON.stringify(data)} `);
        }else{
            res.status(404).send("Account not found")
        }
       
    } catch (error) {
        res.status(400).send({ error: error.message});
        logger.error(`error.message: ${error.message}`);     
    }
});

api.delete("/account/:id", async (req, res) => {
    try {
        
        const data = JSON.parse(await readFile(global.filename, 'utf8'));
        
        const accounts = data.accounts.find(account => account.id !== parseInt(req.params.id, 10) );

        console.log("accounts: ", accounts);

        if(accounts !== undefined){
            const newData = {
                nextId: data.nextId,
                accounts: [accounts]
            };
            await writeFile(global.filename, JSON.stringify(newData));
            res.end();

            logger.info(`DELETE /account:id : ${JSON.stringify(newData)} `);
        }else{
            const newDataVazio = {
                nextId: data.nextId,
                accounts: []
            };
            await writeFile(global.filename, JSON.stringify(newDataVazio));
            res.end();
        }
       
    } catch (error) {
        res.status(400).send({ error: error.message});
        logger.error(`error.message: ${error.message}`);     
    }
});


api.patch("/account/deposito", async (req, res) => {
    try {
        let deposito = req.body;
        const data = JSON.parse(await readFile(global.filename, 'utf8'));
        const account = data.accounts.find(account => account.id === deposito.id);
        if(account){
            const accountIndex = data.accounts.findIndex(account => account.id === deposito.id);
            const saldo = account.balance + deposito.balance;
            const accountNew = {
                ...account,
                balance: saldo
            };
            data.accounts[accountIndex] = accountNew;
            await writeFile(global.filename, JSON.stringify(data));

            res.end();

            logger.info(`PATCH /account/deposito : ${JSON.stringify(data)} `);
        }else{
            res.status(404).send("Account not found")
        }

        
    } catch (error) {
        res.status(400).send({ error: error.message});
        logger.error(`error.message: ${error.message}`);    
    }

});

api.patch("/account/saque", async (req, res) => {
    try {
        let deposito = req.body;
        const data = JSON.parse(await readFile(global.filename, 'utf8'));
        const account = data.accounts.find(account => account.id === deposito.id);
        if(account){
            const accountIndex = data.accounts.findIndex(account => account.id === deposito.id);
            const saldo = account.balance - deposito.balance;
            if(saldo >= 0){
                const accountNew = {
                    ...account,
                    balance: saldo
                };
                data.accounts[accountIndex] = accountNew;
                await writeFile(global.filename, JSON.stringify(data));

                res.end();

                logger.info(`PATCH /account/saldo : ${JSON.stringify(data)} `);
            }else{
                res.status(400).send("Saldo do saque não pode ficar negativo") ; 
                logger.error(`error.message: Saldo do saque não pode ficar negativo`);    
            }
        }else{
            res.status(404).send("Account not found");
            logger.error(`error.message: ccount not found`);
        }

        
    } catch (error) {
        res.status(400).send({ error: error.message});
        logger.error(`error.message: ${error.message}`);    
    }

});


const port = 3000;


api.listen(port, async () => {
    try {
        const fileExistis = await exists(global.filename);
        let initialJson = '';
        if(!fileExistis){
            initialJson = {
                nextId: 1,
                accounts: []
            }
            await writeFile(global.filename, JSON.stringify(initialJson)); 
        };
    } catch (error) {
        logger.error(error);    
    }
    logger.info(`Api inicializada com sucesso na porta ${port}`);
})