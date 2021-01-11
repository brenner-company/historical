/// <reference path=".\stats.d.ts" />

import * as _ from 'lodash';
import * as async from 'async';
import * as hlp from './../../../tools/helpers'; // general helpers
import * as shlp from './helpers'; // 'stats' helpers

export = (gulp, options: Options) => {
    
    const taskName = 'style.stats.store';

    const outputExtension: string = options.style.stats.generator.extension;
    const outputFolder: string = options.style.stats.generator.folders.output;
    const storeFolders = options.style.stats.storage.folders;

    const readOutputFolder = (done: Function) => {
        hlp.walk(outputFolder, (error: any, files: string[]) => {

            if (error) {
                console.error(error);
                return done(error, null);
            }

            if (files.length < 1) {
                return hlp.log('error', taskName, 'the targetted folder did not contain any files');
            }

            const filteredFiles = files.filter((file) => {
                const fileExtension: string = hlp.extractFileExt(file);
                return fileExtension === outputExtension;
            });

            if (filteredFiles.length < 1) {
                return hlp.log('error', taskName, `the targetted folder did not contain any matching files (files need a '${outputExtension}' extension)`);
            }

            const sampleFile = files[0];
            const sampleFileDir = hlp.extractDirName(sampleFile);
            if (!_.includes(sampleFileDir, 'eVolution 3.0')) {
                return hlp.log('error', taskName, 'the targetted folder did not have a path containing an \'eVolution 3.0\' directory');
            }

            done(null, filteredFiles);
        });
    };

    const parseOutputFiles = (outputFiles: Array<string>, done: Function) => {
        let fileList: PointFile[] = [];
        let statisticsLists: PointStatistics = {
            size: [],
            selectors: [],
            declarations: []
        };

        async.eachSeries(outputFiles, (file: string, done: Function) => {

            const fileData = hlp.parsePath(file);
            const sourceDirectory = _.replace(fileData.dir, shlp.convertPath(outputFolder), '\\src\\');

            let fileObj: PointFile = {
                data: fileData,
                source: {
                    dir: sourceDirectory,
                    base: _.replace(fileData.base, '.json', '.css'),
                    location: _.takeRightWhile(_.split(sourceDirectory, '\\'), (dir) => dir !== 'eVolution 3.0')
                }
            };

            fileList.push(fileObj);

            hlp.doesFileExist(file, (error: any, fileExists: boolean) => {

                if (error) {
                    console.error(error);
                    return done(error);
                }
            
                if (fileExists) {
                    hlp.readJsonFromFile(file, (error: any, json: any) => {

                        if (error) {
                            console.error(error);
                            return done(error);
                        }

                        statisticsLists.size.push(json.size);

                        statisticsLists.selectors.push({
                            total: json.selectors.total,
                            class: json.selectors.class,
                            id: json.selectors.id,
                            pseudoClass: json.selectors.pseudoClass,
                            pseudoElement: json.selectors.pseudoElement,
                            values: json.selectors.values,
                            specificity: json.selectors.specificity
                        });

                        statisticsLists.declarations.push({
                            important: json.declarations.important
                        });

                        done();
                    });
                } else {
                    hlp.log('error', taskName, `the targetted file '${fileObj.data.base} doesn't exist`);
                    return done(error);
                }
            });
        },
        (error: any) => {
            if (error) {
                console.error(error);
                return done(error, null, null);
            }

            let pointData: Point = {
                date: {
                    timestamp: hlp.getTimestamp(),
                    readable: hlp.getReadableDate()
                }
            };

            pointData.files = fileList;
            pointData.statistics = statisticsLists;
            
            done(null, pointData);
        });
    };

    const writePointData = (pointData: Point, done: Function) => {
        async.series([
            (done: Function) => { hlp.createPath(storeFolders.overview, done); },
            (done: Function) => { hlp.createFile(`${storeFolders.overview}/data.json`, done); },
            (done: Function) => { hlp.writeJsonToFile(`${storeFolders.overview}/data.json`, pointData, done); }
        ], (error: any) => {
            if (error) {
                console.error(error);
                return done(error);
            }
            
            done(null, pointData);
        });
    }

    const storePointData = (done: Function) => {
        async.waterfall([
            readOutputFolder,
            parseOutputFiles,
            writePointData
        ], (error: any, pointData: Point) => {
            if (error) {
                console.error(error);
                return done(error);
            }

            done(null, pointData);
        });
    };

    const readHistoryFile = (done: Function) => {
        const historyFile: string = `${storeFolders.history}/data.json`;

        hlp.doesFileExist(historyFile, (error: any, fileExists: boolean) => {
            if (error) {
                console.error(error);
                return done(error);
            }
            
            if (fileExists) {
                hlp.readJsonFromFile(historyFile, (error: any, json: any) => {

                    if (error) {
                        console.error(error);
                        return done(error);
                    }

                    done(null, json);
                });
            } else {
                done(null, {});
            }
        });
    };

    const applyMinRhythmLimit = (history: Point[], settings: RhythmSettings, done: Function) => {
        const minLimit: Date = shlp.getLowerInstanceLimit('monthly', options.style.stats.storage.history.limits);

        const filteredHistory = _.filter(history, (point) => {
            const pointDate: Date = shlp.parseTimestamp(point.date.timestamp);

            if (pointDate <= minLimit) {
                return false;
            } else {
                return true;
            }
        });
        
        done(null, filteredHistory);
    };

    const applyRhythmInstance = (instance:string, history: Point[], settings: RhythmSettings, done: Function) => {
        const instanceLimit: number = options.style.stats.storage.history.limits[instance];
        const upperInstanceLimit: Date = shlp.getUpperInstanceLimit(instance, options.style.stats.storage.history.limits);
        const lowerInstanceLimit: Date = shlp.getLowerInstanceLimit(instance, options.style.stats.storage.history.limits);

        let instanceSections: boolean[] = [];

        for (let currentInstance = 0; currentInstance < instanceLimit; currentInstance++) {
            instanceSections.push(false);
        }

        const filteredHistory = _.filter(history, (point) => {
            const pointDate: Date = shlp.parseTimestamp(point.date.timestamp);

            if (pointDate <= upperInstanceLimit && pointDate > lowerInstanceLimit) {
                const timeDiff: number = shlp.getTimeDifference(instance, upperInstanceLimit, pointDate);
                const sectionsIndex = timeDiff;

                if(!instanceSections[sectionsIndex]) {
                    instanceSections[sectionsIndex] = true;
                    return true; 

                } else {
                    return false;
                }
            } else {
                return true;
            }
        });

        done(null, filteredHistory);
    };

    const applyRhythm = (history: Point[], settings: RhythmSettings, done: Function) => {
        const instancesOrder: string[] = ['hourly', 'daily', 'weekly', 'monthly'];
        let waterfallList: Function[] = [];

        history = _.reverse(history);

        instancesOrder.forEach((instance, index) => {
            if(index === 0) {
                waterfallList.push((done: Function) => { applyRhythmInstance(instance, history, settings, done) });
            } else {
                waterfallList.push((history: Point[], done: Function) => { applyRhythmInstance(instance, history, settings, done) });
            }
        });

        waterfallList.push((history: Point[], done: Function) => { applyMinRhythmLimit(history, settings, done) });

        async.waterfall(waterfallList, (error, filteredHistory: Point[]) => {
            if (error) {
                console.error(error);
                return done(error);
            }

            filteredHistory = _.reverse(filteredHistory);

            done(null, filteredHistory);
        });
    };

    const applyHistoryRhythm = (history: Point[], done: Function) => {
        applyRhythm(history, options.style.stats.storage.history, (error, filteredHistory: Point[]) => {
            if (error) {
                console.error(error);
                return done(error);
            }

            done(null, filteredHistory);
        });
    };
   
    const parseHistoryFile = (json: any, point: Point, done: Function) => {        
        const history: Point[] = (json.history !== undefined) ? json.history : [];
        history.push(point);

        const oldHistoryTotal = history.length;

        applyHistoryRhythm(history, (error: any, filteredHistory: Point[]) => {
            if (error) {
                console.error(error);
                return done(error);
            }

            const newHistoryTotal = filteredHistory.length;
            const historyDifference = oldHistoryTotal - newHistoryTotal;

            if(historyDifference > 0) {
                hlp.log('message', taskName, `history rhythm applied: removed ${historyDifference} history points`);
            }
            
            done(null, {history: filteredHistory});
        });
    };

    const writeHistoryData = (json: any, done: Function) => {
        async.series([
            (done: Function) => { hlp.createPath(storeFolders.history, done); },
            (done: Function) => { hlp.createFile(`${storeFolders.history}/data.json`, done); },
            (done: Function) => { hlp.writeJsonToFile(`${storeFolders.history}/data.json`, json, done); }
        ], (error: any) => {
            if (error) {
                console.error(error);
                return done(error);
            }
            
            done();
        });
    }

    const adjustHistoryData = (pointData: Point, done: Function) => {
        async.waterfall([
            (done: Function) => { readHistoryFile(done); },
            (json: any, done: Function) => { parseHistoryFile(json, pointData, done); },
            (json: any, done: Function) => { writeHistoryData(json, done); }
        ], (error: any) => {
            if (error) {
                console.error(error);
                return done(error);
            }

            done(null, pointData);
        });
    };

    const finalizeStore = (pointData: any, done: Function) => {
        const outputCounter = pointData.files.length;
        hlp.log('message', taskName, `succeeded with an output of ${outputCounter} files`);
        done();
    };

    return (done: Function) => {
        hlp.log('message', taskName, 'version 1.0 - 29/11/2016');

        async.waterfall([
            storePointData,
            adjustHistoryData,
            finalizeStore
        ], (error: any) => {
            if (error) {
                console.error(error);
                return done(error);
            }

            return done();
        });
    };
} 