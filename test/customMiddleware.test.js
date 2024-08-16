import { expect } from 'chai';
import CustomMiddleware from '../middlewares/customMiddleware.js';

//USAGE:
//npm install mocha chai --save-dev
// let p = p_msg(DataView(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42))

describe('CustomMiddleware', () => {
    it('should log data exceeding the threshold', () => {
        const threshold = 50;
        const middleware = new CustomMiddleware(threshold);
        let loggedMessage = '';

        console.log = (message) => {
            loggedMessage = message;
        };

        middleware.process(60);

        expect(loggedMessage).to.equal('CustomMiddleware: Data 60 exceeds threshold of 50');
    });

    it('should log data within the acceptable range', () => {
        const threshold = 50;
        const middleware = new CustomMiddleware(threshold);
        let loggedMessage = '';

        console.log = (message) => {
            loggedMessage = message;
        };

        middleware.process(40);

        expect(loggedMessage).to.equal('CustomMiddleware: Data 40 is within acceptable range.');
    });
});