#!/usr/bin/env node

const fs = require('fs');
const argv = require('minimist')(process.argv.slice(2));
const textile = require('./lib/textile.js');

function validate(arguments) {
    return new Promise((fulfill, reject) => {
        if (!arguments._ || !Array.isArray(arguments._) || arguments._.length != 1) {
            reject('Usage: json2md.js [/file/to/convert.json]');
        }

        var fileName = arguments._[0];

        fulfill({ fileName });
    });
}

function read(state) {
    return new Promise((fulfill, reject) => {
        fs.open(state.fileName, 'r', (err, fd) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    reject(`ERROR: The file ${state.fileName} does not exist.`);
                } else {
                    reject(err);
                }
            } else {
                var stream = fs.createReadStream(state.fileName, { fd });
                var content = '';

                stream.on('data', (chunk) => {
                    content += chunk;
                });

                stream.on('end', () => {
                    fulfill({ fileName: state.fileName, content });
                });

                stream.on('error', (err) => {
                    reject(err);
                });
            }
        });
    });
}

function convert(state) {
    return new Promise((fulfill, reject) => {
        var json = JSON.parse(state.content);

        if (!Array.isArray(json)) {
            reject(`ERROR: The file ${state.fileName} needs to be an array.`)
        }

        var converters = json.map(article => textile.convert(article.body));

        return Promise.all(converters).then(convertedArticles => {
            fulfill({
                fileName: state.fileName,
                content: state.content,
                articleCount: json.length
            });
        }).catch(code => reject('Converting from Textile failed: ' + code));
    });
}

function end(state) {
    console.log(`Done converting ${state.articleCount} articles.`);
}

function error(err) {
    console.error(err);
    process.exit(1);
}

validate(argv)
    .then(read)
    .then(convert)
    .then(end)
    .catch(error);
