/**
 * Created with WebStorm.
 * User: stan229
 * Date: 5/20/15
 * Time: 10:13 AM
 */
var path = require('path'),
    LocalStorage = require('node-localstorage').LocalStorage,
    localStorage = new LocalStorage("./storage"),
    cheerio = require('cheerio'),
    qs      = require('querystring'),
    restify = require('restify'),
    exec    = require('child_process').execFileSync;

var indexToKey = ['time', 'clubName', 'duration', 'instructor'];

function getSchedule() {
    return loadScheduleDataForWeek();
}

function loadScheduleDataForWeek() {
    var postData,
        htmlData,
        schedule;


    postData = qs.stringify({
        s        : 2695,
        dy       : '',
        cid      : 0,
        pb       : 1,
        cb       : 1,
        cp       : 1,
        ppbt     : '',
        cbt      : '',
        inf      : 0,
        sc       : 0,
        r        : Math.floor(Math.random() * (2282851 - 228285)) + 22825,
        dispClub : 'undefined'
    });

    htmlData = exec('curl',['-s','--data',postData,'https://www.clubready.com/common/widgets/ClassPublish/ajax_updateclassweek.asp']).toString();
    schedule = parseContent(htmlData);

    return schedule;
}

function parseContent(content) {
    var $ = cheerio.load(content),
        tableRows = $('>tr','#classesTable'),
        length = tableRows.length,
        schedule = [],
        classDate,
        scheduleDay,
        tableRow,
        rowCells,
        i;


    for(i = 0; i < length; i++) {
        tableRow = tableRows[i];

        if(!Object.keys(tableRow.attribs).length) {
            if(scheduleDay) {
                schedule.push(scheduleDay);
            }

            classDate = new Date(Date.parse($(tableRow).find('.accentText')[1].children[0].data));

            scheduleDay = {
                date     : classDate.toISOString(),
                schedule : []
            };

        }
        if(tableRow.attribs.class) {
            rowCells = $(tableRow).children('td');
            scheduleDay.schedule.push({
                time       : rowCells[0].children[0].data,
                instructor : $(rowCells[2]).text(),
                duration   : $(rowCells[4]).text().split('\n')[0]
            })
        }
    }

    schedule.push(scheduleDay);
    return schedule;
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