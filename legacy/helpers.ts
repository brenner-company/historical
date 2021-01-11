import * as _ from 'lodash';

// missing or incompatible typings
const moment = require('moment'); // typings available but incompatible with current TS version (1.7.5)

// predefined measurement list (used as reference)
const measurementList = {
    hourly: 'hour',
    daily: 'day',
    weekly: 'week',
    monthly: 'month'
};

// convert directory path [SYNC]
const convertPath = (path: string) =>  _.chain(path).replace('.', '').replace(/\//g, '\\').value();

// get current date [SYNC]
const getCurrentDate = () => moment();

// get upper instance limit [SYNC]
const getUpperInstanceLimit = (instance: string, limits: Object) => {
    const functionList = {
        hourly: (instance: string, limits: Object) => getCurrentDate().subtract(1, measurementList[instance]).endOf(measurementList[instance]),
        daily: (instance: string, limits: Object) => getCurrentDate().subtract(1, measurementList[instance]).endOf(measurementList[instance]),
        weekly: (instance: string, limits: Object) => getLowerInstanceLimit('daily', limits),
        monthly: (instance: string, limits: Object) => getLowerInstanceLimit('weekly', limits)
    };

    return functionList[instance](instance, limits);
};

// get minimum instance limit [SYNC]
const getLowerInstanceLimit = (instance: string, limits: Object) => {
    return getUpperInstanceLimit(instance, measurementList).subtract(limits[instance], measurementList[instance]);
};

// get time difference [SYNC]
const getTimeDifference = (instance: string ,upper: any, lower: any) => {
    return upper.diff(lower, `${measurementList[instance]}s`);
};

// parse a timestamp [SYNC]
const parseTimestamp = (timestamp: number) => moment(timestamp, 'x');

export {
    convertPath,
    getCurrentDate,
    getUpperInstanceLimit,
    getLowerInstanceLimit,
    getTimeDifference,
    parseTimestamp
};