
import 'dotenv/config';
import express from 'express';
import cookieSession from 'cookie-session';
import axios from "axios";
import crypto from "crypto";
import mysql from 'mysql2/promise';
import bodyParser from "body-parser";
import { body, validationResult } from 'express-validator';
import busboy from 'busboy';

const app = express();

const port = process.env.PORT || 8302;
app.set('view engine', 'ejs');
app.use('/backlog/', express.static('public'));
app.use(cookieSession(
    {
        name: "backlog",
        keys: [crypto.randomBytes(20).toString("hex")],
    }
));
app.use(bodyParser.json())
app.use(bodyParser.urlencoded())

const request = axios.create({});
async function createMySQLClient() {
    return mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USERNAME,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE
    });
}

function isAuthenticated (req, res, next) {
    if (req.session.bcid === '281G3NV') next()
    else next('route')
}

app.get('/', (req, res) => {
    res.redirect(`backlog`);
})

app.get('/editor', (req, res) => {
    res.redirect(`backlog/editor`);
})

app.get('/backlog/', (req, res) => {
    res.render("pages/index.ejs");
})

// async function validateInputs(req, res, next) {
//
//
//     next();
// }

app.post('/backlog/editor', isAuthenticated,
    body("title", "No title supplied")
        .trim().isLength({ min: 1, max: 255 }),
    body("platform", "Platform is required")
        .trim().toLowerCase().escape(),
    body("publisher")
        .optional().trim().isLength({max: 255}).escape(),
    body("date")
        .optional(),
    body("progress")
        .isNumeric(),
    async (req, res) => {
    // console.log('POST request');
    // const bb = busboy({ headers: req.headers });
    // console.log(bb);
    // bb.on('file', (name, file, info) => {
    //     const { filename, encoding, mimeType } = info;
    //     console.log(
    //         `File [${name}]: filename: %j, encoding: %j, mimeType: %j`,
    //         filename,
    //         encoding,
    //         mimeType
    //     );
    //     file.on('data', (data) => {
    //         console.log(`File [${name}] got ${data.length} bytes`);
    //     }).on('close', () => {
    //         console.log(`File [${name}] done`);
    //     });
    // });
    // bb.on('field', (name, val, info) => {
    //     console.log(`Field [${name}]: value: %j`, val);
    // });
    // bb.on('close', () => {
    //     console.log('Done parsing form!');
    // });
    // req.pipe(bb);

    const errors = validationResult(req);

    console.log(errors);

    if (!errors.isEmpty()) {
        return res.send(errors.array());
    }

    const date = req.body.date ? req.body.date : null;

    try {
        const mySqlClient = await createMySQLClient();
        const SQL =
            "INSERT INTO `games` (`title`, `platform`, `publisher`, `release_date`, `progress`) VALUES (?, ?, ?, ?, ?);";

        let f = req.body;
        mySqlClient.execute(
            SQL,
            [f.title, f.platform, f.publisher, date, f.progress],
        );

    } catch (err) {
        console.log(err)
        return res.send("Error");
    }

    // console.log(req.body)
    return res.redirect('/backlog/editor');
})

app.get('/backlog/editor', isAuthenticated, (req, res) => {
    return res.render("pages/editor.ejs");
})

app.get('/backlog/editor', async (req, res) => {

    if (req.query['access_token']) {
        let user = await request.get(
            "https://id.byecorps.com/api/account/me",
            {
                headers: {
                    "Authorization": `Bearer ${req.query['access_token']}`
                }
            }
        );

        console.log(user.data);

        if (user.data.data.id !== '281G3NV') return res.redirect('/backlog/')

        console.log("Welcome back bye.");
        req.session.bcid = await user.data.data.id;

        return res.redirect('/backlog/editor');
    }

    return res.redirect("https://id.byecorps.com/signin/external/basic?appid=565166780&callback=https://byemc.xyz/backlog/editor");
})

app.get('/backlog/api/getGames', async (req, res) => {
    try {
        const mySqlClient = await createMySQLClient();
        const [results, fields] = await mySqlClient.execute(
            "SELECT * FROM games ORDER BY title"
        );
        let output = [];



        return res.json(results);
    } catch (err) {
        console.log(err)
        return res.send("Error");
    }
})

app.listen(port, () => {
    console.log(`Listening on http://localhost:${port}`);
})
