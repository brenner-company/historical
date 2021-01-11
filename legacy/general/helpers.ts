import * as fs from 'fs';
import * as pth from 'path';
import * as mkdirp from 'mkdirp';
import * as util from 'gulp-util';

// missing or incompatible typings
const jfs = require('jsonfile');
const moment = require('moment'); // typings available but incompatible with current TS version (1.7.5)

// parallel walk function (readdir extension) [ASYNC]
const walk = (dir: string, done: Function) => {
    let results = [];

    fs.readdir(dir, (error, list) => {
        if (error) return done(error);

        let pending = list.length;
        if (!pending) return done(null, results);

        list.forEach((file) => {
            file = pth.resolve(dir, file);

            fs.stat(file, (error, stat) => {
                if (stat && stat.isDirectory()) {
                    this.walk(file, function (error, res) {
                        results = results.concat(res);
                        if (!--pending) done(null, results);
                    });
                } else {
                    results.push(file);
                    if (!--pending) done(null, results);
                }
            });
        });
    });
};

// create recursive path [ASYNC]
const createPath = (path: string, done: Function) => {
    fs.access(path, error => {

        if (error && error.code === 'ENOENT') {
            mkdirp(path, null, (error) => {

                if (error) {
                    console.error(error);
                    return done(error);
                } else {
                    done();
                }
            })
        } else {
            done();
        }
    });
};

// check if file exists [ASYNC]
const doesFileExist = (file: string, done: Function) => {
    fs.access(file, error => {

        if (error) {
            if (error.code !== 'ENOENT') {
                console.error(error);
                return done(error);
            } else {
                done(null, false);
            }

        } else {
            done(null, true);
        }
    });
};

// create an empty file [ASYNC]
const createFile = (file: string, done: Function) => {
    fs.open(file, 'a', (error, fd) => {
        
        if (error) {
            console.error(error);
            return done(error);
        } else {
            fs.close(fd, (error) => {

                if (error) {
                    console.error(error);
                    return done(error);
                } else {
                    done();
                }
            });
        }
    });
};

// write JSON to file [ASYNC]
const writeJsonToFile = (file: string, json: Object, done: Function) => {
    jfs.writeFile(file , json, {spaces: 2}, (error: any) => {

        if (error) {
            console.error(error);
            return done(error);
        } else {
            done();
        }
    });
};

// read JSON from file (checks if file exists first) [ASYNC]
const readJsonFromFile = (file: string, done: Function) => {
    doesFileExist(file, (error: any, fileExists: boolean) => {
        
        if (fileExists) {
            jfs.readFile(file, function(error: any, json: Object) {

                if (error) {
                    console.error(error);
                    return done(error);
                } else {
                    done(null, json);
                }
            });
        }
    });
};

// extract file extension from a path (string) [SYNC]
const extractFileExt = (path: string) => {
    const fileName = pth.basename(path);
    return pth.extname(fileName).slice(1);
};

// extract directory name from a path (string) [SYNC]
const extractDirName = (path: string) => pth.dirname(path);

// parse path (string) [SYNC]
const parsePath = (path: string) => pth.parse(path);

// get timestamp [SYNC]
const getTimestamp = () => moment().valueOf();

// get readable date [SYNC]
const getReadableDate = (format: string = null) => moment().format(format);

// log a task-related message, error, etc. [SYNC]
const log = (type: string, source: string, message: string) => {
    let output;

    switch (type) {
        case 'error':
            output = `${util.colors.red('error')}: ${message}`
            break;
    
        default: // type = message & fallback
            output = `${message}`
            break;
    }

    util.log(`Running '${util.colors.cyan(source)}' (${output})`);
}; 

// index (convert dot-notation to object) [SYNC]
const getReferenceValue = (ref: string, obj: Object) => {
    return ref.split('.').reduce((obj, index) => obj[index], obj);
};

export {
    walk,
    createPath,
    doesFileExist,
    createFile,
    writeJsonToFile,
    readJsonFromFile,
    extractFileExt,
    extractDirName,
    parsePath,
    getTimestamp,
    getReadableDate,
    log,
    getReferenceValue
};