/**
 * Created with WebStorm.
 * User: stan229
 * Date: 5/20/15
 * Time: 10:13 AM
 */
var cheerio = require('cheerio'),
    https   = require('https'),
    qs      = require('querystring'),
    restify = require('restify'),
    moment  = require('moment');

function loadScheduleDataForWeek(serverRes) {
    var options,
        postData,
        htmlData,
        schedule,
        req,
        dataChunks;

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

    options = {
        hostname : 'www.clubready.com',
        path     : '/common/widgets/ClassPublish/ajax_updateclassweek.asp',
        method   : 'POST',
        headers  : {
            'Content-Type'   : 'application/x-www-form-urlencoded',
            'Content-Length' : postData.length
        }
    };

    dataChunks = [];

    req = https.request(options, function (res) {
            res.on('data', function (chunk) {
                dataChunks.push(chunk);
            });
            res.on('end', function () {
                htmlData = dataChunks.join('').toString();

                schedule = parseContent(htmlData);

                serverRes.json(schedule);
            });
        }
    );

    req.write(postData);
    req.end();
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
                date     : moment(classDate, 'MMM DD, YYYY').toISOString(),
                schedule : []
            };

        }
        if(tableRow.attribs.class) {
            rowCells = $(tableRow).children('td');
            scheduleDay.schedule.push({
                time       : rowCells[0].children[0].data.toUpperCase(),
                instructor : $(rowCells[2]).text(),
                duration   : $(rowCells[4]).text().split('\n')[0]
            })
        }
    }

    schedule.push(scheduleDay);

    return schedule;
}

var server = restify.createServer();

server.use(restify.CORS());

server.get('/', function (req, res, next) {
    next();
});

server.get('/schedule/', function (req, res, next) {
    loadScheduleDataForWeek(res);
});

server.listen(process.env.PORT || 8080, function () {
    console.log('server active on port ', process.env.PORT || 8080);
});