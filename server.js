/**
 * Created with WebStorm.
 * User: stan229
 * Date: 5/20/15
 * Time: 10:13 AM
 */
var path = require('path'),
    childProcess = require('child_process'),
    LocalStorage = require('node-localstorage').LocalStorage,
    localStorage = new LocalStorage("./storage"),
    cheerio = require('cheerio'),
    restify = require('restify');

var indexToKey = ['time', 'clubName', 'duration', 'instructor'];

function getSchedule() {
    var today = Date.now(),
        expires = localStorage.getItem('schedule_expires') || 0;

    return (parseInt(expires, 10) > today) ? JSON.parse(localStorage.getItem('schedule')) : loadScheduleDataForWeek();
}

function loadScheduleDataForWeek() {
    var stdout = childProcess.execFileSync('phantomjs', [path.join(__dirname, 'phantom-script.js')]),
        schedule = parseContent(stdout),
        tomorrow = new Date();

    tomorrow.setDate(tomorrow.getDate() + 1);

    localStorage.setItem('schedule', JSON.stringify(schedule));
    localStorage.setItem('schedule_expires', tomorrow.getTime());

    return schedule;
}


function parseContent(content) {
    var $ = cheerio.load(content),
        schedule = [],
        classDate = new Date(),
        i;


    for (i = 0; i < 7; i++) {
        classDate.setDate(classDate.getDate() + (i ? 1 : 0));

        schedule.push({
            date     : classDate.toISOString(),
            schedule : getTableData($, i + 1)
        });
    }

    return schedule;
}

function getTableData($, day) {
    var tables = $('#day' + day + '>table').find('table'),
        length = tables.length,
        dayData = [],
        table,
        session,
        i;

    for (i = 0; i < length; i++) {

        table = tables[i];
        session = {};

        $(table).find('tr').each(function (index, value) {
            var $row = $(this);

            if (index < 4) {
                session[indexToKey[index]] = $row.find('td').text().replace(/\n/g, '').trim();
            }
        });

        dayData.push(session);
    }

    return dayData;
}

function clearLocalStorage() {
    localStorage.removeItem('schedule');
    localStorage.removeItem('schedule_expires');
}
var server = restify.createServer();

server.use(restify.CORS());

server.get('/', function (req, res, next) {
    res.send('Hello World');
    next();
});

server.get('/schedule/', function (req, res, next) {
    res.json(getSchedule());
    return next();
});

server.get('/schedule/:force', function (req, res, next) {
    if(req.params.force === 'true') {
        clearLocalStorage();
    }
    res.json(getSchedule());
    return next();
});

server.listen(process.env.PORT || 8080, function () {
    console.log('server active on port ', process.env.PORT || 8080);
});